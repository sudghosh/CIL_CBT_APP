# User Management & Email Whitelisting

## Overview

The CIL CBT Application uses an email whitelisting system to control access. Only users with whitelisted email addresses can register and use the application. This document explains how the email whitelisting system works and how to manage users.

## Email Whitelisting

### How It Works

1. Admin users can whitelist email addresses through the User Management interface
2. When a new user attempts to log in with Google OAuth, their email is checked against the whitelist
3. If the email is whitelisted, the user is allowed to create an account
4. If not, access is denied with an appropriate error message

### API Endpoints

The backend provides two endpoints for email whitelisting:

1. `POST /admin/allowed-emails`: Add a new email to the whitelist
   - Requires admin privileges
   - Request body format: `{ "email": "user@example.com" }`
   - Returns success status and confirmation message

2. `GET /admin/allowed-emails`: List all whitelisted emails
   - Requires admin privileges
   - Returns a list of all whitelisted emails with metadata

## User Management

### Features

1. **View Users**: Admins can see a list of all users in the system
2. **Toggle User Status**: Admins can activate/deactivate users
3. **Change User Role**: Admins can promote users to admin or demote admins to regular users
4. **Whitelist Email**: Add new email addresses to allow new users to register

### API Endpoints

1. `GET /auth/users`: Get list of all users
2. `PUT /auth/users/{user_id}/status`: Update user active status
3. `PUT /auth/users/{user_id}/role`: Update user role

## Frontend Implementation

The User Management interface is available to admin users through the sidebar menu. The interface allows:

1. Viewing all users in a table format
2. Toggling user status with a switch
3. Changing user role with a button
4. Adding new whitelisted emails through a dialog

## Security Considerations

- All admin endpoints require authentication and admin role verification
- Rate limiting is applied to prevent abuse
- Input validation ensures only valid email formats are accepted
- Detailed logging tracks all user management actions

## Troubleshooting

Common issues that may occur:

1. **"Failed to whitelist email"**: 
   - Check the email is in valid format
   - Confirm you have admin privileges
   - Verify the API endpoint is available

2. **User cannot login despite whitelisted email**:
   - Check the exact email spelling (case-sensitive)
   - Ensure Google authentication is working properly
   - Verify the user's account is active

## Future Enhancements

Planned improvements to user management:

1. Bulk email whitelisting through CSV upload
2. Domain-based whitelisting (e.g., all emails from @company.com)
3. Temporary access tokens for guest users
4. Enhanced auditing of user management actions
