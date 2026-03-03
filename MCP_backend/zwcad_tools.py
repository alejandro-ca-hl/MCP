"""Tool definitions for ZWCAD integration."""

from typing import Dict, Any, List, Union
from zwcad_manager import zwcad_manager

def get_zwcad_tool_definitions() -> List[Dict[str, Any]]:
    """Return ZWCAD tool schemas."""
    return [
        {
            "type": "function",
            "function": {
                "name": "zwcad_get_layers",
                "description": "Get a list of all layer names in the currently connected ZWCAD drawing.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "zwcad_freeze_layers",
                "description": "Freeze or thaw specific layers in the connected ZWCAD drawing. To unfreeze (thaw), set freeze=False.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "layer_names": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of layer names to modify (e.g. ['WALL', 'DOOR'])"
                        },
                        "freeze": {
                            "type": "boolean",
                            "description": "True to freeze (hide), False to thaw (show). Default is True.",
                            "default": True
                        }
                    },
                    "required": ["layer_names"]
                }
            }
        }
    ]

def execute_zwcad_tool(name: str, arguments: Dict[str, Any]) -> str:
    """Execute ZWCAD tools."""
    try:
        if name == "zwcad_get_layers":
            try:
                layers = zwcad_manager.get_layers()
            except Exception as e:
                return f"Error retrieving layers: {e}. Please ensure ZWCAD is open and a drawing is connected via the frontend."

            if not layers:
                return "The drawing has 0 layers or could not be read. Please verify the connection."
            
            return f"Found {len(layers)} layers in the active drawing:\n" + "\n".join(f"- {l}" for l in layers)
            
        elif name == "zwcad_freeze_layers":
            layer_names = arguments.get("layer_names", [])
            freeze = arguments.get("freeze", True)
            
            # Handle string input if LLM passes a single string instead of list
            if isinstance(layer_names, str):
                layer_names = [layer_names]
            
            if not layer_names:
                return "Error: No layer names provided to freeze/thaw."
            
            if not zwcad_manager.get_active_document_name():
                 return "Error: No active ZWCAD connection. Please tell the user to connect via the ZWCAD button."

            try:
                modified = zwcad_manager.freeze_layers(layer_names, freeze)
            except Exception as e:
                 return f"Error executing freeze_layers: {e}"

            action = "Frozen" if freeze else "Thawed"
            
            if not modified:
                return f"No layers were {action.lower()}. Possible reasons: Layers not found, or tried to freeze the active layer."
                
            return f"Successfully {action.lower()} the following layers:\n" + "\n".join(f"- {l}" for l in modified)
            
        else:
            return f"Error: Unknown ZWCAD tool '{name}'"
            
    except Exception as e:
        return f"ZWCAD Tool Critical Error: {str(e)}"
