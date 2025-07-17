# FastAPI CORS Setup Guide (Development & Production)

## Switching CORS Modes

### Development Mode
- Set environment variable `ENV=development`.
- Optionally set `CORS_ALLOW_ALL=true` to allow all local origins.
- Default allowed origins: `http://localhost:3000`, `http://127.0.0.1:3000`.
- You can override with `CORS_ORIGINS` (comma-separated list).

**Example .env for development:**
```
ENV=development
CORS_ALLOW_ALL=true
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Production Mode
- Set environment variable `ENV=production`.
- Set `CORS_ORIGINS` to a comma-separated list of allowed domains (e.g., your frontend URLs).
- Do NOT set `CORS_ALLOW_ALL=true` in production.

**Example .env for production:**
```
ENV=production
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

## How It Works
- The backend reads `ENV`, `CORS_ALLOW_ALL`, and `CORS_ORIGINS`.
- In development or if `CORS_ALLOW_ALL=true`, local origins are allowed.
- In production, only origins listed in `CORS_ORIGINS` are allowed.
- No code changes needed—just update environment variables and restart the backend.

## Troubleshooting
- If CORS errors occur, check the browser console and backend logs for the list of allowed origins.
- Make sure your frontend URL matches one of the allowed origins exactly (including protocol and port).
- For Cloud Run, set environment variables in the service configuration.

---
_Last updated: July 17, 2025_
