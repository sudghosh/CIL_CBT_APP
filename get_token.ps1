$response = Invoke-RestMethod -Uri http://localhost:8000/auth/dev-login -Method Post -ContentType 'application/json' -Body '{"email": "dev@example.com", "role": "Admin"}'
$response | ConvertTo-Json -Depth 10 | Out-File -FilePath ".\token_response.json"
