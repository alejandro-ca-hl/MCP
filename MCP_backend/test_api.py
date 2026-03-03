"""
Script de prueba para validar la conexión y herramientas MCP.
"""

import requests
import json

# Configuración
API_URL = "http://localhost:8000"

# Credenciales de prueba (reemplazar con tus credenciales reales)
TEST_CREDENTIALS = {
    "db_host": "gondola.proxy.rlwy.net",
    "db_port": 16395,
    "db_username": "postgres",
    "db_password": "your_password_here",  # ⚠️ CAMBIAR
    "db_database": "railway"
}


def test_health_check():
    """Test health check endpoint."""
    print("🔍 Testing health check...")
    try:
        response = requests.get(f"{API_URL}/health")
        print(f"✅ Status: {response.status_code}")
        print(f"📄 Response: {json.dumps(response.json(), indent=2)}\n")
        return True
    except Exception as e:
        print(f"❌ Error: {e}\n")
        return False


def test_root_endpoint():
    """Test root endpoint."""
    print("🔍 Testing root endpoint...")
    try:
        response = requests.get(API_URL)
        print(f"✅ Status: {response.status_code}")
        print(f"📄 Response: {json.dumps(response.json(), indent=2)}\n")
        return True
    except Exception as e:
        print(f"❌ Error: {e}\n")
        return False


def test_validate_connection(credentials):
    """Test connection validation endpoint."""
    print("🔍 Testing connection validation...")
    try:
        response = requests.post(
            f"{API_URL}/validate-connection",
            json=credentials,
            headers={"Content-Type": "application/json"}
        )
        print(f"Status: {response.status_code}")
        result = response.json()
        
        if result.get("success"):
            print(f"✅ Connection successful!")
            print(f"📄 Message: {result.get('message')}")
            if result.get("details"):
                print(f"📊 Details: {json.dumps(result['details'], indent=2)}")
        else:
            print(f"❌ Connection failed!")
            print(f"📄 Message: {result.get('message')}")
        
        print()
        return result.get("success", False)
    except Exception as e:
        print(f"❌ Error: {e}\n")
        return False


def test_invalid_credentials():
    """Test with invalid credentials."""
    print("🔍 Testing invalid credentials (should fail)...")
    invalid_creds = {
        "db_host": "invalid_host",
        "db_port": 5432,
        "db_username": "invalid_user",
        "db_password": "invalid_pass",
        "db_database": "invalid_db"
    }
    
    try:
        response = requests.post(
            f"{API_URL}/validate-connection",
            json=invalid_creds,
            headers={"Content-Type": "application/json"}
        )
        result = response.json()
        
        if not result.get("success"):
            print(f"✅ Correctly rejected invalid credentials")
            print(f"📄 Error message: {result.get('message')}\n")
            return True
        else:
            print(f"❌ Unexpected: Invalid credentials were accepted\n")
            return False
    except Exception as e:
        print(f"❌ Error: {e}\n")
        return False


def test_disconnect():
    """Test disconnect endpoint."""
    print("🔍 Testing disconnect endpoint...")
    try:
        response = requests.delete(f"{API_URL}/disconnect")
        result = response.json()
        
        if result.get("success"):
            print(f"✅ Disconnect successful")
            print(f"📄 Message: {result.get('message')}\n")
            
            # Verify config file is gone
            import os
            if not os.path.exists("db_config.json"):
                print("✅ db_config.json was removed")
                return True
            else:
                print("❌ db_config.json still exists!")
                return False
        else:
            print(f"❌ Disconnect failed")
            return False
    except Exception as e:
        print(f"❌ Error: {e}\n")
        return False


def test_chat_mock():
    """Test Chat endpoint inputs (mocking external API)."""
    print("🔍 Testing Chat endpoint (Dry Run)...")
    
    # Needs valid credentials to test fully, so we just check if endpoint accepts request
    # Since we can't easily mock OpenAI/Anthropic without API Keys, we expect a 500 or 400 
    # if we send dummy keys, but at least we can reach the endpoint.
    
    chat_payload = {
        "messages": [{"role": "user", "content": "Test"}],
        "provider": "openai",
        "model": "gpt-3.5-turbo",
        "api_key": "sk-dummy-key"
    }
    
    try:
        response = requests.post(
            f"{API_URL}/chat",
            json=chat_payload,
            headers={"Content-Type": "application/json"}
        )
        
        # We expect error because of invalid API KEY, but status should be 500 (upstream error) 
        # or 401 (from OpenAI if they check key format locally) 
        # or just check that we didn't get 404/422 (schema error)
        
        print(f"Status: {response.status_code}")
        if response.status_code != 404:
            print(f"✅ Endpoint /chat exists and processed parameters")
            return True
        else:
            print(f"❌ Endpoint /chat not found")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}\n")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("🚀 MCP PostgreSQL Backend - Test Suite")
    print("=" * 60)
    print()
    
    # Check if server is running
    print("⚙️  Checking if server is running...")
    try:
        requests.get(API_URL, timeout=2)
        print("✅ Server is running\n")
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running!")
        print("💡 Please start the server with: python main.py\n")
        return
    
    # Run tests
    results = []
    
    results.append(("Health Check", test_health_check()))
    results.append(("Root Endpoint", test_root_endpoint()))
    results.append(("Invalid Credentials", test_invalid_credentials()))
    results.append(("Chat Endpoint Existence", test_chat_mock()))
    
    # Only test valid connection if credentials are provided
    if TEST_CREDENTIALS["db_password"] != "your_password_here":
        results.append(("Valid Connection", test_validate_connection(TEST_CREDENTIALS)))
        # Verify file creation
        import os
        if os.path.exists("db_config.json"):
            print("✅ db_config.json created successfully\n")
            
            # Now test disconnect
            results.append(("Disconnect", test_disconnect()))
        else:
            print("❌ db_config.json was NOT created!\n")
    else:
        print("⚠️  Skipping valid connection and disconnect tests (update TEST_CREDENTIALS)\n")
    
    # Summary
    print("=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print()
    print(f"Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
    else:
        print("⚠️  Some tests failed. Please check the output above.")


if __name__ == "__main__":
    main()
