"""Shared tool definitions and execution logic."""

from typing import Any, Dict, List, Optional
from db_manager import db_manager

from zwcad_tools import get_zwcad_tool_definitions, execute_zwcad_tool
from db_tools import get_db_tool_definitions, execute_db_tool

class ToolManager:
    """Manages tool definitions and execution."""

    @staticmethod
    def get_tool_definitions() -> List[Dict[str, Any]]:
        """
        Get tool definitions in OpenAI/JSON schema format.
        Useful for LLM function calling.
        """
        # Return DB tools by default as they are the primary set
        # ZWCAD tools are injected separately in llm_service.py if active
        return get_db_tool_definitions()

    @staticmethod
    def execute_tool(name: str, arguments: Dict[str, Any]) -> str:
        """
        Execute a tool by name with arguments.
        
        Args:
            name: Tool name
            arguments: Tool arguments dictionary
            
        Returns:
            String result of execution
        """
        # Dispatch to ZWCAD tools
        if name.startswith("zwcad_"):
             return execute_zwcad_tool(name, arguments)

        # Dispatch to Database tools
        # We assume any other tool is a DB tool for now, or check explicit names
        db_tools = ["list_tables", "describe_table", "query_database", "get_table_sample"]
        if name in db_tools:
            return execute_db_tool(name, arguments)

        return f"Error: Unknown tool '{name}'"

tool_manager = ToolManager()
