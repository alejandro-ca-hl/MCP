"""ZWCAD connection manager using COM interface."""

import logging
import comtypes.client
from typing import List, Tuple, Optional, Any
import json
import os

logger = logging.getLogger(__name__)


class ZwcadManager:
    """Manages ZWCAD COM connection and operations."""
    
    def __init__(self):
        self.config_file = "zwcad_config.json"

    def get_open_drawings(self) -> Tuple[bool, str, List[str]]:
        """
        Connect to running ZWCAD instance and get open drawings.
        """
        try:
            app = comtypes.client.GetActiveObject("ZWCAD.Application")
            docs = app.Documents
            
            drawings = []
            count = docs.Count
            
            for i in range(count):
                try:
                    doc = docs.Item(i)
                    drawings.append(doc.Name)
                except Exception as e:
                    logger.warning(f"Error accessing document at index {i}: {e}")
                    continue

            return True, "Connected to ZWCAD", drawings

        except Exception as e:
            error_msg = str(e)
            if "operation unavailable" in error_msg.lower() or "invalid syntax" in error_msg.lower():
                 return False, "ZWCAD is not running. Please open ZWCAD and try again.", []
            
            logger.warning(f"ZWCAD connection failed: {e}")
            return False, "ZWCAD is not running or not accessible.", []

    def connect_to_drawing(self, filename: str) -> Tuple[bool, str]:
        """Save selected drawing filename to config."""
        try:
            # Verify checking if drawing is still open
            success, msg, drawings = self.get_open_drawings()
            if not success:
                return False, msg
            
            if filename not in drawings:
                return False, f"Drawing '{filename}' is no longer open in ZWCAD."

            # Save config
            config = {"filename": filename}
            with open(self.config_file, "w") as f:
                json.dump(config, f, indent=2)
                
            return True, f"Connected to {filename}"
            
        except Exception as e:
            logger.error(f"Error saving ZWCAD config: {e}")
            return False, str(e)

    def disconnect(self):
        """Remove ZWCAD config file."""
        if os.path.exists(self.config_file):
            os.remove(self.config_file)

    def get_active_document_name(self) -> Optional[str]:
        """Get connected drawing name from config."""
        if not os.path.exists(self.config_file):
            return None
        try:
            with open(self.config_file, "r") as f:
                config = json.load(f)
                return config.get("filename")
        except:
            return None

    def _get_document_by_name(self, filename: str) -> Any:
        try:
            app = comtypes.client.GetActiveObject("ZWCAD.Application")
            docs = app.Documents
            count = docs.Count
            for i in range(count):
                doc = docs.Item(i)
                if doc.Name == filename:
                    return doc
            return None
        except:
            return None
            
    def get_layers(self) -> List[str]:
        """Get list of all layer names in the connected drawing."""
        target_doc_name = self.get_active_document_name()
        if not target_doc_name:
            raise ValueError("No ZWCAD drawing connected.")
            
        doc = self._get_document_by_name(target_doc_name)
        if not doc:
             raise ValueError(f"Drawing '{target_doc_name}' is not open in ZWCAD.")
             
        layers = []
        for i in range(doc.Layers.Count):
            layers.append(doc.Layers.Item(i).Name)
            
        return layers

    def freeze_layers(self, layer_names: List[str], freeze: bool = True) -> List[str]:
        """
        Freeze or thaw specified layers.
        Returns list of layers successfully modified.
        """
        target_doc_name = self.get_active_document_name()
        if not target_doc_name:
             raise ValueError("No ZWCAD drawing connected.")

        doc = self._get_document_by_name(target_doc_name)
        if not doc:
             raise ValueError(f"Drawing '{target_doc_name}' is not open in ZWCAD.")
        
        modified = []
        
        # Activate document first to ensure we can modify it
        if doc.ActiveSpace != 1: # Checking if model space active (optional but good practice)
             pass
        
        doc.Activate()

        for layer_name in layer_names:
            try:
                # ZWCAD COM: Layers collection accessible by name
                layer = doc.Layers.Item(layer_name)
                
                # Freeze property: True/False
                # Cannot freeze the current active layer
                if layer_name == doc.ActiveLayer.Name and freeze:
                     logger.warning(f"Cannot freeze active layer: {layer_name}")
                     continue
                     
                layer.Freeze = freeze
                modified.append(layer_name)
            except Exception as e:
                logger.warning(f"Error modifying layer {layer_name}: {e}")
                
        # Regen to see changes
        doc.Regen(1) # acAllViewports = 1
        return modified

# Global instance
zwcad_manager = ZwcadManager()
