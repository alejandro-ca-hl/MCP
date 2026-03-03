"""Tool definitions for PostgreSQL Database integration."""

from typing import Dict, Any, List
from db_manager import db_manager

def get_db_tool_definitions() -> List[Dict[str, Any]]:
    """Return PostgreSQL tool schemas."""
    return [
        {
            "type": "function",
            "function": {
                "name": "list_tables",
                "description": "List all tables in the connected PostgreSQL database. Returns table schema, name, and type.",
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
                "name": "describe_table",
                "description": "Get detailed information about a specific table including columns, data types, and constraints.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "table_name": {
                            "type": "string",
                            "description": "Name of the table to describe (can include schema as schema.table)"
                        }
                    },
                    "required": ["table_name"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "query_database",
                "description": "Execute a read-only SQL query (SELECT only). All other operations are blocked for security.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "SQL SELECT query to execute"
                        }
                    },
                    "required": ["query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_table_sample",
                "description": "Get sample rows from a table for exploration and understanding the data structure.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "table_name": {
                            "type": "string",
                            "description": "Name of the table to sample"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Number of rows to return (default: 10, max: 100)",
                            "default": 10
                        }
                    },
                    "required": ["table_name"]
                }
            }
        }
    ]

def execute_db_tool(name: str, arguments: Dict[str, Any]) -> str:
    """Execute Database tools."""
    # Ensure dynamic connection before execution
    if not db_manager.ensure_dynamic_connection():
            return "Error: No active database connection. Please connect via the frontend first."

    try:
        if name == "list_tables":
            tables = db_manager.list_tables()
            if not tables:
                return "No tables found in the database."
            
            result = "Tables in database:\n\n"
            for table in tables:
                result += f"- {table['table_schema']}.{table['table_name']} ({table['table_type']})\n"
            return result
        
        elif name == "describe_table":
            table_name = arguments.get("table_name")
            if not table_name:
                return "Error: table_name is required"
            
            table_info = db_manager.describe_table(table_name)
            
            result = f"Table: {table_info['schema']}.{table_info['table']}\n\n"
            result += "Columns:\n"
            for col in table_info['columns']:
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
                max_len = f"({col['character_maximum_length']})" if col['character_maximum_length'] else ""
                pk_marker = " [PRIMARY KEY]" if col['column_name'] in table_info['primary_keys'] else ""
                result += f"  - {col['column_name']}: {col['data_type']}{max_len} {nullable}{default}{pk_marker}\n"
            return result
        
        elif name == "query_database":
            query = arguments.get("query")
            if not query:
                return "Error: query is required"
            
            result = db_manager.execute_query(query)
            output = f"Query executed successfully. {result['row_count']} rows returned.\n\n"
            if result['row_count'] == 0:
                output += "No results found."
            else:
                rows_to_show = min(result['row_count'], 100)
                output += f"Columns: {', '.join(result['columns'])}\n\n"
                output += "Results:\n"
                for i, row in enumerate(result['rows'][:rows_to_show]):
                    output += f"{i+1}. {row}\n"
                if result['row_count'] > 100:
                    output += f"\n... and {result['row_count'] - 100} more rows"
            return output

        elif name == "get_table_sample":
            table_name = arguments.get("table_name")
            limit = min(arguments.get("limit", 10), 100)
            if not table_name:
                return "Error: table_name is required"
            
            result = db_manager.get_table_sample(table_name, limit)
            output = f"Sample from table '{table_name}' ({result['row_count']} rows):\n\n"
            output += f"Columns: {', '.join(result['columns'])}\n\n"
            for i, row in enumerate(result['rows']):
                output += f"{i+1}. {row}\n"
            return output
        
        else:
            return f"Error: Unknown database tool '{name}'"
            
    except ValueError as e:
        return f"Security Error: {str(e)}"
    except Exception as e:
        return f"Database Tool Error: {str(e)}"
