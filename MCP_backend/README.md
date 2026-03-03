# PostgreSQL Chat Backend (MCP Tools)

Backend en Python que funciona como servidor MCP (Model Context Protocol) con herramientas de PostgreSQL de solo lectura.

## 🚀 Características

- ✅ **Endpoint FastAPI** para validar conexiones de PostgreSQL
- 🛠️ **Servidor MCP** con herramientas de base de datos (solo lectura)
- 🔒 **Seguridad**: Solo permite consultas SELECT
- 🌐 **CORS** configurado para integración con frontend
- 📊 **4 herramientas MCP**:
  - `list_tables` - Lista todas las tablas
  - `describe_table` - Describe estructura de tabla
  - `query_database` - Ejecuta consultas SELECT
  - `get_table_sample` - Obtiene datos de muestra

## 📋 Requisitos

- Python 3.9+
- PostgreSQL (para conectarse)

## 🔧 Instalación

1. **Clonar o navegar al directorio**
```bash
cd c:\Users\Desktop\Documents\Agentes\MCP\MCP_backend
```

2. **Crear entorno virtual**
```bash
python -m venv venv
venv\Scripts\activate
```

3. **Instalar dependencias**
```bash
pip install -r requirements.txt
```

4. **Configurar variables de entorno** (opcional)
```bash
copy .env.example .env
# Editar .env con tus configuraciones
```

## 🎯 Uso

### Opción 1: FastAPI (Validación de Conexión)

**Iniciar servidor FastAPI:**
```bash
python main.py
```

El servidor estará disponible en `http://localhost:8000`

**Endpoints disponibles:**
- `GET /` - Información de la API
- `GET /health` - Health check
- `POST /validate-connection` - Validar credenciales de PostgreSQL (y guardar configuración)
- `DELETE /disconnect` - Desconectar y borrar credenciales

**Ejemplo de solicitud:**
```bash
curl -X POST http://localhost:8000/validate-connection \
  -H "Content-Type: application/json" \
  -d '{
    "db_host": "gondola.proxy.rlwy.net",
    "db_port": 16395,
    "db_username": "postgres",
    "db_password": "tu_password",
    "db_database": "railway"
  }'
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Connection successful. PostgreSQL version: ...",
  "details": {
    "host": "gondola.proxy.rlwy.net",
    "port": 16395,
    "database": "railway"
  }
}
```

**Desconectar:**
```bash
curl -X DELETE http://localhost:8000/disconnect
```

### Opción 2: Servidor MCP (Para LLM)

El servidor MCP está diseñado para trabajar dinámicamente con la configuración validada por el servidor FastAPI.

1. **Frontend valida conexión** -> FastAPI crea `db_config.json`.
2. **LLM consulta MCP** -> MCP lee `db_config.json` y se conecta automáticamente.
3. **Frontend desconecta** -> FastAPI borra `db_config.json`.
4. **LLM consulta MCP** -> MCP detecta falta de archivo y responde "No hay conexión activa".

**Iniciar servidor MCP:**
```bash
python mcp_server.py
```

El servidor MCP se ejecuta en modo stdio y está listo para ser utilizado por un cliente MCP (como Claude Desktop u otro LLM).

- **Cambiar BD**: Si validas otra conexión, el LLM cambiará automáticamente a la nueva BD.
- **Desconectar**: Si llamas a `DELETE /disconnect`, el LLM perderá el acceso a las herramientas de BD.

## 💬 API de Chat

El backend expone un endpoint para interactuar con la base de datos usando lenguaje natural.

### `POST /chat`

Este endpoint recibe tus mensajes y configuración, y se encarga de:
1. Conectar con OpenAI o Anthropic.
2. Inyectar las herramientas de base de datos (`list_tables`, `query`, etc.).
3. Ejecutar las herramientas automáticamente cuando el LLM lo solicita.
4. Devolver la respuesta final procesada.

**Payload:**
```json
{
  "messages": [
    {"role": "user", "content": "Dame los 5 usuarios más recientes"}
  ],
  "provider": "openai",
  "model": "gpt-4o",
  "api_key": "sk-..."
}
```

**Respuesta:**
```json
{
  "role": "assistant",
  "content": "Aquí están los 5 usuarios más recientes:\n1. Juan Perez..."
}
```

**Proveedores Soportados:**
- `openai` (Modelos: `gpt-4o`, `gpt-3.5-turbo`, etc.)
- `anthropic` (Modelos: `claude-3-5-sonnet`, `claude-3-opus`, etc.)

## 🛠️ Herramientas Disponibles (Tools)

### 1. `list_tables`
Lista todas las tablas en la base de datos.

**Sin parámetros**

**Ejemplo de uso con LLM:**
> "¿Qué tablas existen en la base de datos?"

### 2. `describe_table`
Describe la estructura de una tabla.

**Parámetros:**
- `table_name` (string): Nombre de la tabla (ej: "usuarios" o "public.usuarios")

**Ejemplo de uso con LLM:**
> "Describe la estructura de la tabla usuarios"

### 3. `query_database`
Ejecuta una consulta SQL SELECT.

**Parámetros:**
- `query` (string): Consulta SQL SELECT

**Restricciones de seguridad:**
- ✅ Solo permite SELECT
- ❌ Bloquea INSERT, UPDATE, DELETE, DROP, etc.

**Ejemplo de uso con LLM:**
> "Ejecuta: SELECT * FROM productos WHERE precio > 100 LIMIT 10"

### 4. `get_table_sample`
Obtiene datos de muestra de una tabla.

**Parámetros:**
- `table_name` (string): Nombre de la tabla
- `limit` (integer, opcional): Número de filas (default: 10, max: 100)

**Ejemplo de uso con LLM:**
> "Muéstrame 5 ejemplos de la tabla clientes"

## 🔒 Seguridad

### Características de Seguridad:

1. **Solo lectura (READ-ONLY)**
   - Solo se permiten consultas SELECT
   - Todas las demás operaciones son bloqueadas

2. **Validación de consultas**
   - Análisis de sintaxis SQL
   - Detección de palabras clave peligrosas
   - Prevención de inyección SQL

3. **Gestión de errores**
   - Mensajes de error informativos pero seguros
   - No expone información sensible del sistema

4. **CORS configurado**
   - Solo orígenes permitidos pueden acceder a la API

## 📁 Estructura del Proyecto

```
MCP_backend/
├── main.py              # FastAPI application
├── mcp_server.py        # MCP server con herramientas PostgreSQL
├── db_manager.py        # Gestión de conexiones y consultas
├── config.py            # Configuración de la aplicación
├── requirements.txt     # Dependencias Python
├── .env.example         # Template de variables de entorno
├── .gitignore          # Archivos ignorados por Git
└── README.md           # Esta documentación
```

## 🐛 Troubleshooting

### Error: "Module not found"
```bash
pip install -r requirements.txt
```

### Error: "Connection refused"
Verifica que las credenciales de la base de datos sean correctas.

### Error: "CORS policy blocked"
Agrega el origen de tu frontend en `.env`:
```
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### El LLM no ve las herramientas
1. Verifica que el servidor MCP esté corriendo
2. Revisa la configuración de Claude Desktop
3. Reinicia Claude Desktop
4. Verifica los logs del servidor MCP

## 📝 Notas

- **No se almacenan credenciales**: El endpoint de validación solo verifica la conexión y no guarda las credenciales
- **Conexión directa**: El servidor MCP requiere credenciales de base de datos en variables de entorno
- **Timeout de conexión**: 5 segundos por defecto

## 🤝 Flujo de Integración Frontend → LLM

```
1. Frontend → FastAPI POST /validate-connection
   ↓
2. FastAPI valida credenciales con PostgreSQL
   ↓
3. FastAPI responde success/error
   ↓
4. Usuario configura Claude Desktop con credenciales
   ↓
5. LLM → Servidor MCP (herramientas PostgreSQL)
   ↓
6. Servidor MCP → PostgreSQL (solo SELECT)
   ↓
7. PostgreSQL → Servidor MCP → LLM → Usuario
```

## 📄 Licencia

Este proyecto es de código abierto.
