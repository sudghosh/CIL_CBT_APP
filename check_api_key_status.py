import requests

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiaW50eS5naG9zaEBnbWFpbC5jb20iLCJyb2xlIjoiQWRtaW4iLCJ1c2VyX2lkIjoxLCJleHAiOjE3NTQwNjE4Nzh9.Xi3S4Yv-cPjxH2_Mp_GH2odrJN84_WT1pCxolM-N0D4"
headers = {"Authorization": f"Bearer {token}"}

response = requests.get("http://localhost:8000/ai/api-key-status", headers=headers)
print(f"Status code: {response.status_code}")
print(f"Response JSON: {response.json() if response.status_code == 200 else response.text}")

