"""Database connection manager for PostgreSQL."""

import psycopg2
from psycopg2 import sql, OperationalError, DatabaseError
from typing import Dict, List, Any, Optional, Tuple
import re


class DatabaseManager:
    """Manages PostgreSQL database connections and queries."""
    
    def __init__(self):
        """Initialize database manager."""
        self.connection = None
        self.connection_params = None
        self.config_file = "db_config.json"
        self.last_config_hash = None
    
    def _get_config_hash(self, config: Dict) -> str:
        """Generate a simple hash for configuration comparison."""
        import json
        return hash(json.dumps(config, sort_keys=True))

    def load_config_from_file(self) -> Optional[Dict]:
        """Load database configuration from local file."""
        import json
        import os
        
        if not os.path.exists(self.config_file):
            return None
            
        try:
            with open(self.config_file, 'r') as f:
                return json.load(f)
        except Exception:
            return None

    def ensure_dynamic_connection(self) -> bool:
        """
        Ensure database connection matches the current configuration file.
        Returns True if connected, False otherwise.
        """
        config = self.load_config_from_file()
        
        if not config:
            # If no config file, but we have an active connection -> Disconnect
            if self.connection:
                self.disconnect()
            return False
            
        # Check if config has changed
        current_hash = self._get_config_hash(config)
        
        if self.connection is None or self.last_config_hash != current_hash:
            # Reconnect with new config
            try:
                self.disconnect() # Close old connection if exists
                self.connect(
                    config["db_host"],
                    config["db_port"],
                    config["db_username"],
                    config["db_password"],
                    config["db_database"]
                )
                self.last_config_hash = current_hash
                return True
            except Exception:
                return False
        
        # Connection is valid and config hasn't changed
        return True
    
    def validate_connection(self, 
                          db_host: str, 
                          db_port: int, 
                          db_username: str, 
                          db_password: str, 
                          db_database: str) -> Tuple[bool, str]:
        """
        Validate PostgreSQL connection credentials.
        
        Args:
            db_host: Database host
            db_port: Database port
            db_username: Database username
            db_password: Database password
            db_database: Database name
            
        Returns:
            Tuple of (success: bool, message: str)
        """
        try:
            # Attempt connection
            conn = psycopg2.connect(
                host=db_host,
                port=db_port,
                user=db_username,
                password=db_password,
                database=db_database,
                connect_timeout=5
            )
            
            # Test the connection
            cursor = conn.cursor()
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            cursor.close()
            conn.close()
            
            return True, f"Connection successful. PostgreSQL version: {version[0][:50]}..."
            
        except OperationalError as e:
            error_msg = str(e)
            if "password authentication failed" in error_msg:
                return False, "Invalid credentials: Authentication failed"
            elif "could not connect to server" in error_msg:
                return False, f"Connection failed: Cannot reach server at {db_host}:{db_port}"
            elif "database" in error_msg and "does not exist" in error_msg:
                return False, f"Database '{db_database}' does not exist"
            else:
                return False, f"Connection error: {error_msg}"
                
        except DatabaseError as e:
            return False, f"Database error: {str(e)}"
            
        except Exception as e:
            return False, f"Unexpected error: {str(e)}"
    
    def connect(self, 
                db_host: str, 
                db_port: int, 
                db_username: str, 
                db_password: str, 
                db_database: str) -> None:
        """
        Establish database connection for MCP server.
        
        Args:
            db_host: Database host
            db_port: Database port
            db_username: Database username
            db_password: Database password
            db_database: Database name
        """
        self.connection_params = {
            "host": db_host,
            "port": db_port,
            "user": db_username,
            "password": db_password,
            "database": db_database
        }
        
        self.connection = psycopg2.connect(**self.connection_params)
    
    def disconnect(self) -> None:
        """Close database connection."""
        if self.connection:
            self.connection.close()
            self.connection = None
    
    def is_safe_query(self, query: str) -> Tuple[bool, str]:
        """
        Validate that query is read-only (SELECT only).
        
        Args:
            query: SQL query to validate
            
        Returns:
            Tuple of (is_safe: bool, error_message: str)
        """
        # Remove comments and normalize whitespace
        query_normalized = re.sub(r'--.*$', '', query, flags=re.MULTILINE)
        query_normalized = re.sub(r'/\*.*?\*/', '', query_normalized, flags=re.DOTALL)
        query_normalized = query_normalized.strip().upper()
        
        # Check for dangerous keywords
        dangerous_keywords = [
            'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
            'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE'
        ]
        
        for keyword in dangerous_keywords:
            if re.search(rf'\b{keyword}\b', query_normalized):
                return False, f"Query contains forbidden keyword: {keyword}"
        
        # Must start with SELECT (after removing whitespace)
        if not query_normalized.startswith('SELECT'):
            return False, "Only SELECT queries are allowed"
        
        return True, ""
    
    def execute_query(self, query: str, params: Optional[List] = None) -> Dict[str, Any]:
        """
        Execute a read-only SQL query.
        
        Args:
            query: SQL query to execute
            params: Optional query parameters
            
        Returns:
            Dictionary with columns and rows
        """
        # Validate query is safe
        is_safe, error_msg = self.is_safe_query(query)
        if not is_safe:
            raise ValueError(f"Unsafe query: {error_msg}")
        
        if not self.connection:
            raise ConnectionError("Not connected to database")
        
        try:
            cursor = self.connection.cursor()
            cursor.execute(query, params or [])
            
            # Get column names
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            
            # Fetch all rows
            rows = cursor.fetchall()
            
            # Convert to list of dictionaries
            results = [dict(zip(columns, row)) for row in rows]
            
            cursor.close()
            
            return {
                "columns": columns,
                "rows": results,
                "row_count": len(results)
            }
            
        except Exception as e:
            raise Exception(f"Query execution failed: {str(e)}")
    
    def list_tables(self) -> List[Dict[str, str]]:
        """
        List all tables in the database.
        
        Returns:
            List of dictionaries with table information
        """
        query = """
            SELECT 
                table_schema,
                table_name,
                table_type
            FROM information_schema.tables
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY table_schema, table_name;
        """
        
        result = self.execute_query(query)
        return result["rows"]
    
    def describe_table(self, table_name: str) -> Dict[str, Any]:
        """
        Get detailed information about a table.
        
        Args:
            table_name: Name of the table (can include schema as schema.table)
            
        Returns:
            Dictionary with table structure information
        """
        # Parse schema and table name
        parts = table_name.split('.')
        if len(parts) == 2:
            schema, table = parts
        else:
            schema = 'public'
            table = table_name
        
        # Get column information
        columns_query = """
            SELECT 
                column_name,
                data_type,
                character_maximum_length,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema = %s AND table_name = %s
            ORDER BY ordinal_position;
        """
        
        columns_result = self.execute_query(columns_query, [schema, table])
        
        # Get primary key information
        pk_query = """
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = %s::regclass AND i.indisprimary;
        """
        
        try:
            pk_result = self.execute_query(pk_query, [f"{schema}.{table}"])
            primary_keys = [row["attname"] for row in pk_result["rows"]]
        except:
            primary_keys = []
        
        return {
            "schema": schema,
            "table": table,
            "columns": columns_result["rows"],
            "primary_keys": primary_keys
        }
    
    def get_table_sample(self, table_name: str, limit: int = 10) -> Dict[str, Any]:
        """
        Get sample rows from a table.
        
        Args:
            table_name: Name of the table
            limit: Number of rows to return (default: 10)
            
        Returns:
            Dictionary with sample data
        """
        # Sanitize table name to prevent SQL injection
        # Only allow alphanumeric, underscore, and dot
        if not re.match(r'^[a-zA-Z0-9_.]+$', table_name):
            raise ValueError("Invalid table name")
        
        query = f"SELECT * FROM {table_name} LIMIT %s;"
        return self.execute_query(query, [limit])


# Global database manager instance
db_manager = DatabaseManager()
