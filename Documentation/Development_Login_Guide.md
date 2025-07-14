# Development Login Guide for CIL_CBT_App

## What is Development Login?
Development Login is a special feature for local development and testing. It allows you to bypass Google OAuth and log in instantly as an admin user, without using real credentials. This is useful for rapid testing and debugging.

## How to Enable Development Login

1. **Set the Environment Variable:**
   - In your `.env.dev` file, ensure you have:
     ```
     ENABLE_DEV_LOGIN=true
     ```
   - For production (`.env.prod`), this should always be:
     ```
     ENABLE_DEV_LOGIN=false
     ```

2. **Start the App in Development Mode:**
   - Use Docker Compose:
     ```
     docker-compose -f docker-compose.dev.yml up --build
     ```
   - Or run the frontend and backend locally with the correct `.env.dev` loaded.

3. **Access the Login Page:**
   - When `ENABLE_DEV_LOGIN=true`, you will see a button labeled **Development Login (Bypass Google)** and a "Development Mode" icon (if applicable).
   - When `ENABLE_DEV_LOGIN=false`, these options are hidden and only Google login is available.

## How to Use Development Login

1. On the login page, click the **Development Login (Bypass Google)** button.
2. You will be logged in as a development admin user (e.g., `dev@example.com`).
3. You can now access all admin features for testing.

## Security Warning
- **Never enable development login in production!**
- Always keep `ENABLE_DEV_LOGIN=false` in `.env.prod` and production Docker configs.

## Troubleshooting
- If the button does not appear, check your `.env` and Docker Compose settings.
- Restart the frontend and backend after changing environment variables.
- For more help, see `Documentation/06-Troubleshooting_Fixes/`.

---
_Last updated: July 14, 2025_
