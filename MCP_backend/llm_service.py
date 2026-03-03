"""LLM Service for handling chat interactions with tools."""

from typing import List, Dict, Any
import json
import logging

# Providers
from openai import OpenAI
from anthropic import Anthropic

from tools import tool_manager
from db_manager import db_manager

logger = logging.getLogger(__name__)


async def process_chat(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process a chat request using the specified provider and available tools.
    Handles the tool-use loop (LLM -> Tool -> LLM).

    Args:
        request: dict with keys: messages, provider, model, api_key
    """
    # Only expose database tools if a configuration exists
    if db_manager.load_config_from_file():
        tools = tool_manager.get_tool_definitions()
    else:
        tools = []

    # Inject ZWCAD tools if available
    from zwcad_manager import zwcad_manager
    from zwcad_tools import get_zwcad_tool_definitions
    
    if zwcad_manager.get_active_document_name():
        tools.extend(get_zwcad_tool_definitions())

    provider = request["provider"].lower()
    if provider == "openai":
        return await _process_openai(request, tools)
    elif provider == "anthropic":
        return await _process_anthropic(request, tools)
    else:
        raise ValueError(f"Unsupported provider: {request['provider']}")


async def _process_openai(request: Dict[str, Any], tools: List[Dict]) -> Dict[str, Any]:
    """Process chat using OpenAI SDK with multi-turn tool support."""
    client = OpenAI(api_key=request["api_key"])

    # Prepare messages
    messages = [{"role": m["role"], "content": m["content"]} for m in request["messages"]]

    max_turns = 5
    current_turn = 0

    while current_turn < max_turns:
        current_turn += 1
        
        try:
            response = client.chat.completions.create(
                model=request["model"],
                messages=messages,
                tools=tools if tools else None,
                tool_choice="auto" if tools else None
            )

            message = response.choices[0].message

            # If no tool calls, return the response content
            if not message.tool_calls:
                return {
                    "role": "assistant",
                    "content": message.content
                }

            # If tool calls, execute them and continue loop
            messages.append(message)

            for tool_call in message.tool_calls:
                function_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)

                logger.info(f"Executing tool: {function_name}")
                tool_result = tool_manager.execute_tool(function_name, arguments)
                logger.info(f"Tool Result ({function_name}): {tool_result[:500]}..." if len(tool_result) > 500 else f"Tool Result ({function_name}): {tool_result}")

                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": function_name,
                    "content": tool_result
                })

        except Exception as e:
            logger.error(f"OpenAI Error: {e}")
            raise e

    return {
        "role": "assistant",
        "content": "Error: Maximum tool execution turns reached."
    }


async def _process_anthropic(request: Dict[str, Any], tools: List[Dict]) -> Dict[str, Any]:
    """Process chat using Anthropic SDK."""
    client = Anthropic(api_key=request["api_key"])

    # Adapt tools format for Anthropic
    anthropic_tools = []
    for t in tools:
        anthropic_tools.append({
            "name": t["function"]["name"],
            "description": t["function"]["description"],
            "input_schema": t["function"]["parameters"]
        })

    # Anthropic expects 'user' or 'assistant' roles
    messages = [{"role": m["role"], "content": m["content"]} for m in request["messages"] if m["role"] != "system"]

    # Extract system prompt if present
    system_prompt = next(
        (m["content"] for m in request["messages"] if m["role"] == "system"),
        "You are a helpful assistant with access to a PostgreSQL database."
    )

    try:
        response = client.messages.create(
            model=request["model"],
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
            tools=anthropic_tools
        )

        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})

            tool_results = []

            for block in response.content:
                if block.type == "tool_use":
                    tool_name = block.name
                    tool_input = block.input
                    tool_id = block.id

                    logger.info(f"Executing tool: {tool_name}")
                    result = tool_manager.execute_tool(tool_name, tool_input)

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_id,
                        "content": result
                    })

            messages.append({
                "role": "user",
                "content": tool_results
            })

            final_response = client.messages.create(
                model=request["model"],
                max_tokens=1024,
                system=system_prompt,
                messages=messages,
                tools=anthropic_tools
            )

            return {
                "role": "assistant",
                "content": final_response.content[0].text
            }

        else:
            return {
                "role": "assistant",
                "content": response.content[0].text
            }

    except Exception as e:
        logger.error(f"Anthropic Error: {e}")
        raise e
