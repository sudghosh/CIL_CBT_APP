import os

api_key_encryption_key = os.environ.get("API_KEY_ENCRYPTION_KEY")
if api_key_encryption_key:
    print(f"API_KEY_ENCRYPTION_KEY environment variable is set. Length: {len(api_key_encryption_key)}")
    print(f"First few characters: {api_key_encryption_key[:10]}...")
else:
    print("API_KEY_ENCRYPTION_KEY environment variable is NOT set!")

# List other relevant environment variables
print("\nOther environment variables:")
for key, value in os.environ.items():
    if "key" in key.lower() or "api" in key.lower() or "encrypt" in key.lower():
        masked_value = value[:5] + "..." if value else "None"
        print(f"{key}: {masked_value}")
