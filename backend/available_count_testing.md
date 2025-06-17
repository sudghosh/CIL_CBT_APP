# Manual Testing Instructions for Available Question Count

To test if the backend fix for the `/questions/available-count` endpoint is working correctly, follow these steps:

## 1. Obtain an Authentication Token

1. Log in to the application in your web browser
2. Open the browser's developer tools (F12)
3. Go to the 'Application' tab (Chrome/Edge) or 'Storage' tab (Firefox)
4. Look for 'Local Storage' in the left panel
5. Find the item that contains your authentication token (usually named 'token', 'auth_token', etc.)
6. Copy the token value

## 2. Test Using cURL or Postman

### Using cURL:

Make a GET request to the endpoint with your auth token:

```
curl -X GET "http://localhost:8000/questions/available-count?paper_id=1" -H "Authorization: Bearer YOUR_TOKEN_HERE" -H "accept: application/json"
```

Test with different parameters:

```
curl -X GET "http://localhost:8000/questions/available-count?paper_id=1&section_id=1" -H "Authorization: Bearer YOUR_TOKEN_HERE" -H "accept: application/json"
```

### Using Postman:

1. Create a new GET request to `http://localhost:8000/questions/available-count?paper_id=1`
2. Add an Authorization header: `Authorization: Bearer YOUR_TOKEN_HERE`
3. Send the request
4. Observe the response - it should return a JSON object with a `count` field

## 3. Expected Results

- The endpoint should return a `200 OK` status code (not 422)
- The response should include a `count` field with the number of available questions
- Even if no questions are available, it should return `{"count": 0, ...}` rather than an error

## 4. Verify in the Frontend

1. Open the Practice Test page in the application
2. Select a paper and section
3. Observe if the available question count is displayed correctly
4. Check the browser console for any errors related to the `/questions/available-count` endpoint

If the fix was successful, there should be no more 422 errors and the available question count should be properly displayed in the UI.
