import httpx
import os

# Create a simple test script to check if we can connect to external AI providers
async def test_openrouter_connection():
    print("Testing connection to OpenRouter...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://openrouter.ai/")
            print(f"OpenRouter status code: {response.status_code}")
    except Exception as e:
        print(f"OpenRouter connection error: {e}")

async def test_google_connection():
    print("Testing connection to Google AI...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://generativelanguage.googleapis.com/")
            print(f"Google AI status code: {response.status_code}")
    except Exception as e:
        print(f"Google AI connection error: {e}")

async def test_a4f_connection():
    print("Testing connection to A4F...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://api.a4f.co/")
            print(f"A4F status code: {response.status_code}")
    except Exception as e:
        print(f"A4F connection error: {e}")

async def main():
    await test_openrouter_connection()
    await test_google_connection()
    await test_a4f_connection()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
