# Guía de Integración Frontend - Backend - LLM

## Arquitectura General

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌──────────────┐
│   Frontend  │─────▶│  FastAPI     │─────▶│ PostgreSQL  │      │     LLM      │
│  (Next.js)  │      │  (Port 8000) │      │   Database  │      │   (Claude)   │
└─────────────┘      └──────────────┘      └─────────────┘      └──────────────┘
                            │                      ▲                      │
                            │                      │                      │
                            └──────────────────────┘                      │
                                  Validación                              │
                                                                          │
                     ┌────────────────────────────────────────────────────┘
                     │
                     ▼
              ┌──────────────┐
              │  MCP Server  │─────▶ PostgreSQL (READ-ONLY)
              │ (stdio mode) │
              └──────────────┘
```

## Flujo Completo

### Paso 1: Frontend envía credenciales

**Frontend (Next.js/React)**

```typescript
// Ejemplo de función para validar conexión
async function validateConnection() {
  const credentials = {
    db_host: "gondola.proxy.rlwy.net",
    db_port: 16395,
    db_username: "postgres",
    db_password: "yrhfsahjfsahlasfjasr",
    db_database: "railway"
  };

  try {
    const response = await fetch('http://localhost:8000/validate-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Conexión exitosa:', result.message);
      // Guardar credenciales para configurar MCP
      localStorage.setItem('db_credentials', JSON.stringify(credentials));
      // Mostrar mensaje de éxito al usuario
      return { success: true, data: result };
    } else {
      console.error('❌ Error de conexión:', result.message);
      // Mostrar error al usuario
      return { success: false, error: result.message };
    }
  } catch (error) {
    console.error('❌ Error de red:', error);
    return { success: false, error: 'Error de conexión con el servidor' };
  }
}
```

### Paso 2: Backend valida credenciales

**Backend (FastAPI)** - Ya implementado en `main.py`

El endpoint `/validate-connection`:
1. Recibe las credenciales
2. Intenta conectarse a PostgreSQL
3. Ejecuta una query de prueba (`SELECT version()`)
4. Retorna success o error con mensaje descriptivo

### Paso 3: Usuario configura LLM con MCP

**Opción A: Claude Desktop (Recomendado)**

1. El usuario edita la configuración de Claude Desktop
2. Archivo: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "postgresql": {
      "command": "python",
      "args": ["C:\\Users\\Desktop\\Documents\\Agentes\\MCP\\MCP_backend\\mcp_server.py"],
      "env": {
        "DB_HOST": "gondola.proxy.rlwy.net",
        "DB_PORT": "16395",
        "DB_USERNAME": "postgres",
        "DB_PASSWORD": "yrhfsahjfsahlasfjasr",
        "DB_DATABASE": "railway"
      }
    }
  }
}
```

3. Reiniciar Claude Desktop
4. Las herramientas PostgreSQL están ahora disponibles

**Opción B: Configuración Automática desde Frontend**

El frontend puede generar el archivo de configuración:

```typescript
function generateClaudeConfig(credentials: any) {
  const config = {
    mcpServers: {
      postgresql: {
        command: "python",
        args: ["C:\\Users\\Desktop\\Documents\\Agentes\\MCP\\MCP_backend\\mcp_server.py"],
        env: {
          DB_HOST: credentials.db_host,
          DB_PORT: credentials.db_port.toString(),
          DB_USERNAME: credentials.db_username,
          DB_PASSWORD: credentials.db_password,
          DB_DATABASE: credentials.db_database
        }
      }
    }
  };

  // Descargar como archivo JSON
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'claude_desktop_config.json';
  a.click();
}
```

### Paso 4: LLM interactúa con PostgreSQL

Una vez configurado, el usuario puede hacer preguntas a Claude:

**Ejemplos de interacción:**

```
Usuario: "¿Qué tablas hay en mi base de datos?"
Claude: [Usa tool: list_tables]
         "En tu base de datos hay las siguientes tablas:
         - public.users (BASE TABLE)
         - public.products (BASE TABLE)
         - public.orders (BASE TABLE)"

Usuario: "Describe la tabla users"
Claude: [Usa tool: describe_table con table_name="users"]
         "La tabla users tiene la siguiente estructura:
         - id: integer NOT NULL [PRIMARY KEY]
         - email: varchar(255) NOT NULL
         - name: varchar(100) NULL
         - created_at: timestamp DEFAULT now()"

Usuario: "Muéstrame los últimos 5 usuarios registrados"
Claude: [Usa tool: query_database con query="SELECT * FROM users ORDER BY created_at DESC LIMIT 5"]
         "Aquí están los últimos 5 usuarios:
         1. {'id': 105, 'email': 'juan@example.com', 'name': 'Juan', ...}
         ..."

Usuario: "Elimina todos los usuarios" (⚠️ INTENTO DE OPERACIÓN PELIGROSA)
Claude: [Intenta usar tool: query_database con query="DELETE FROM users"]
         "Security Error: Query contains forbidden keyword: DELETE"
```

## Integración Avanzada: Frontend ↔ LLM

Si quieres que el frontend también pueda enviar consultas SQL directamente:

### Opción: Agregar endpoint proxy en FastAPI

**Agregar a `main.py`:**

```python
@app.post("/query")
async def execute_query(query_request: dict):
    """Proxy endpoint para ejecutar queries desde el frontend."""
    if not db_manager.connection:
        raise HTTPException(status_code=400, detail="Database not connected")
    
    query = query_request.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    try:
        result = db_manager.execute_query(query)
        return {
            "success": True,
            "data": result
        }
    except ValueError as e:
        # Security error
        return {
            "success": False,
            "error": str(e)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**Uso desde Frontend:**

```typescript
async function executeQuery(sqlQuery: string) {
  const response = await fetch('http://localhost:8000/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sqlQuery })
  });

  const result = await response.json();
  return result;
}

// Ejemplo de uso
const result = await executeQuery("SELECT * FROM users LIMIT 10");
console.log(result.data.rows);
```

## Seguridad

### 🔒 Protecciones Implementadas

1. **Validación de queries**: Solo SELECT permitido
2. **Sanitización**: Prevención de SQL injection
3. **Timeouts**: Límite de 5 segundos en conexiones
4. **CORS**: Solo orígenes específicos permitidos
5. **No almacenamiento**: Credenciales no se guardan en servidor

### ⚠️ Mejores Prácticas

1. **Usar HTTPS en producción**: Nunca enviar credenciales por HTTP
2. **Variables de entorno**: No hardcodear credenciales
3. **Usuario de solo lectura**: Crear usuario PostgreSQL con permisos limitados
4. **Rate limiting**: Agregar límites de peticiones
5. **Logs**: Monitorear accesos y queries ejecutadas

## Ejemplo de Usuario PostgreSQL de Solo Lectura

```sql
-- Crear usuario de solo lectura
CREATE USER readonly_user WITH PASSWORD 'secure_password';

-- Dar acceso a la base de datos
GRANT CONNECT ON DATABASE railway TO readonly_user;

-- Dar acceso de solo lectura a un schema
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- Para tablas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;
```

Usar este usuario en lugar del usuario `postgres` principal.

## Testing

### Test 1: Validar Conexión

```bash
curl -X POST http://localhost:8000/validate-connection \
  -H "Content-Type: application/json" \
  -d '{
    "db_host": "gondola.proxy.rlwy.net",
    "db_port": 16395,
    "db_username": "postgres",
    "db_password": "yrhfsahjfsahlasfjasr",
    "db_database": "railway"
  }'
```

### Test 2: Probar Servidor MCP

1. Configurar variables de entorno
2. Ejecutar `python mcp_server.py`
3. Configurar Claude Desktop
4. Hacer preguntas a Claude sobre la base de datos

## Troubleshooting

### El frontend no puede conectarse al backend
- Verificar CORS en `.env`
- Verificar que FastAPI esté corriendo en puerto 8000
- Revisar firewall/antivirus

### Claude no ve las herramientas MCP
- Verificar que `mcp_server.py` esté corriendo
- Revisar configuración en `claude_desktop_config.json`
- Reiniciar Claude Desktop completamente
- Verificar logs del servidor MCP

### Queries fallan con "Security Error"
- Verificar que la query sea SELECT
- No usar palabras clave prohibidas
- Revisar sintaxis SQL

## Próximos Pasos

1. ✅ Configurar servidor FastAPI
2. ✅ Probar endpoint de validación desde frontend
3. ✅ Configurar servidor MCP con credenciales
4. ✅ Conectar Claude Desktop al servidor MCP
5. ✅ Probar herramientas PostgreSQL desde Claude
6. 🔄 Implementar logging y monitoreo
7. 🔄 Agregar rate limiting
8. 🔄 Configurar HTTPS en producción
