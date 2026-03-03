"""FastAPI application for PostgreSQL connection validation."""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import logging

from config import settings
from db_manager import db_manager
from llm_service import process_chat

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="MCP PostgreSQL Backend",
    description="FastAPI server for validating PostgreSQL connections",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API Endpoints
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "MCP PostgreSQL Backend",
        "version": "1.0.0",
        "endpoints": {
            "validate_connection": "/validate-connection",
            "health": "/health"
        },
        "mcp_server": {
            "status": "Run mcp_server.py separately for MCP tools",
            "tools": ["list_tables", "describe_table", "query_database", "get_table_sample"]
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "MCP PostgreSQL Backend",
        "environment": settings.environment
    }


@app.post("/validate-connection")
async def validate_connection(request: Request):
    """
    Validate PostgreSQL connection credentials.

    Expects JSON body with: db_host, db_port, db_username, db_password, db_database
    """
    credentials = await request.json()

    # Validate required fields
    required = ["db_host", "db_port", "db_username", "db_password", "db_database"]
    for field in required:
        if field not in credentials:
            raise HTTPException(status_code=422, detail=f"Missing required field: {field}")

    db_host = credentials["db_host"]
    db_port = int(credentials["db_port"])
    db_username = credentials["db_username"]
    db_password = credentials["db_password"]
    db_database = credentials["db_database"]

    logger.info(f"Validating connection to {db_host}:{db_port}/{db_database}")

    try:
        success, message = db_manager.validate_connection(
            db_host=db_host,
            db_port=db_port,
            db_username=db_username,
            db_password=db_password,
            db_database=db_database
        )

        if success:
            import json

            config_data = {
                "db_host": db_host,
                "db_port": db_port,
                "db_username": db_username,
                "db_password": db_password,
                "db_database": db_database
            }

            try:
                with open("db_config.json", "w") as f:
                    json.dump(config_data, f, indent=2)
            except Exception as e:
                logger.error(f"Failed to save credentials: {e}")

            logger.info(f"Connection successful: {db_host}:{db_port}")
            return {
                "success": True,
                "message": message,
                "details": {
                    "host": db_host,
                    "port": db_port,
                    "database": db_database
                }
            }
        else:
            logger.warning(f"Connection failed: {message}")
            return {
                "success": False,
                "message": message
            }

    except Exception as e:
        logger.error(f"Unexpected error during connection validation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.delete("/disconnect")
async def disconnect_database():
    """Disconnect from the current database and remove stored credentials."""
    import os

    try:
        if os.path.exists("db_config.json"):
            os.remove("db_config.json")

        db_manager.disconnect()

        return {"success": True, "message": "Disconnected and credentials removed"}

    except Exception as e:
        logger.error(f"Error disconnecting: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/connect-zwcad")
async def connect_zwcad():
    """Attempt to connect to ZWCAD and retrieve open drawings."""
    from zwcad_manager import zwcad_manager

    success, message, drawings = zwcad_manager.get_open_drawings()

    if not success:
        return {
            "success": False,
            "message": message,
            "drawings": []
        }

    return {
        "success": True,
        "message": message,
        "drawings": drawings
    }


@app.post("/connect-zwcad-file")
async def connect_zwcad_file(request: Request):
    """
    Connect to a specific ZWCAD drawing file.
    Expects JSON body: { "filename": "Drawing1.dwg" }
    """
    from zwcad_manager import zwcad_manager
    
    body = await request.json()
    filename = body.get("filename")
    
    if not filename:
        raise HTTPException(status_code=422, detail="Filename is required")

    success, message = zwcad_manager.connect_to_drawing(filename)
    
    if success:
        return {"success": True, "message": message}
    else:
        return {"success": False, "message": message}


@app.delete("/disconnect-zwcad")
async def disconnect_zwcad():
    """Disconnect from ZWCAD drawing and remove configuration."""
    from zwcad_manager import zwcad_manager
    
    try:
        zwcad_manager.disconnect()
        return {"success": True, "message": "ZWCAD disconnected"}
    except Exception as e:
        logger.error(f"Error disconnecting ZWCAD: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat_endpoint(request: Request):
    """Chat with the LLM using the connected database tools."""
    body = await request.json()

    # Validate required fields
    required = ["messages", "provider", "model", "api_key"]
    for field in required:
        if field not in body:
            raise HTTPException(status_code=422, detail=f"Missing required field: {field}")

    try:
        response = await process_chat(body)
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting FastAPI server on {settings.api_host}:{settings.api_port}")
    logger.info(f"CORS enabled for origins: {settings.cors_origins_list}")

    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )
