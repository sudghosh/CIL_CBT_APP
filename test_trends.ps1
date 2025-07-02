$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiaW50eS5naG9zaEBnbWFpbC5jb20iLCJyb2xlIjoiQWRtaW4iLCJ1c2VyX2lkIjoxLCJleHAiOjE3NTQwNjE4Nzh9.Xi3S4Yv-cPjxH2_Mp_GH2odrJN84_WT1pCxolM-N0D4"
$headers = @{ "Authorization" = "Bearer $token" }
$body = @{
    timeframe = "month"
    analysisType = "overall"
} | ConvertTo-Json

try {
    # Print the URL and request info for debugging
    Write-Host "Making request to: http://localhost:8000/ai/analyze-trends"
    Write-Host "Request body: $body"
    Write-Host "Headers: $($headers | ConvertTo-Json)"
    
    Invoke-RestMethod -Uri http://localhost:8000/ai/analyze-trends -Method Post -Headers $headers -Body $body -ContentType 'application/json' -ErrorAction Stop
} catch {
    Write-Host "Error calling API:"
    Write-Host $_.Exception.ToString()
    if ($_.Exception.Response) {
        $responseStream = $_.Exception.Response.GetResponseStream()
        $streamReader = New-Object System.IO.StreamReader($responseStream)
        $responseBody = $streamReader.ReadToEnd()
        Write-Host "Response Body:"
        Write-Host $responseBody
    }
}
