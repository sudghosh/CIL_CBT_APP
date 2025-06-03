# Authentication Flow Documentation

## Overview

This document outlines the authentication flow implemented in the CIL CBT App backend, focusing on Google authentication, role management, and security practices.

## Authentication Flow

### 1. Google Authentication

The application uses Google OAuth for authentication. Here's the flow:

1. **User Login Request**:
   - User initiates login through the frontend using Google OAuth
   - Frontend obtains a Google token and sends it to the backend

2. **Token Verification**:
   - Backend verifies the token with Google
   - Extracts user information (email, name, Google ID)

3. **Email Whitelist Check**:
   - **CRITICAL SECURITY CHECK**: Verifies if the user's email is in the allowed emails whitelist
   - If not whitelisted, the authentication process fails with a 401 error

4. **User Management**:
   - For existing users: Preserves their stored role in the database
   - For new users: Creates a user record with the default role "User"
   - Updates user details like first name and last name if needed

5. **Token Generation**:
   - Creates a JWT token containing:
     - Email address (`sub` claim)
     - User role (`role` claim)
     - User ID (`user_id` claim)
     - Expiration time (`exp` claim)

6. **Response**:
   - Returns the token to the frontend for storage and use in subsequent requests

### 2. Role-Based Authorization

The application implements role-based access control:

1. **Admin Role**:
   - Pre-seeded in the database during initialization
   - Has access to all endpoints including user management and question banks
   - Can promote users to Admin or demote them to User

2. **User Role**:
   - Default role assigned to all new users
   - Has limited access based on role-based permission checks

3. **Role Verification**:
   - On each request, the `verify_token` middleware extracts and verifies the role
   - Endpoints that require Admin privileges use the `verify_admin` middleware

### 3. Security Measures

1. **Email Whitelist**:
   - Only whitelisted emails can access the system
   - Admins can add new emails to the whitelist

2. **Token Security**:
   - Short-lived access tokens (30 minutes)
   - Role and user ID embedded in token for authorization
   - Token verification on every protected endpoint

3. **Database Verification**:
   - Even with a valid token, the system verifies the user exists in the database
   - Checks if the user is active
   - Ensures the role in the token matches the current role in the database

### 4. Development Utilities

1. **Dev Login Endpoint**:
   - Available only in development environment
   - Creates a development admin user for testing
   - Adds the development email to the whitelist
   - Issues a long-lived token (30 days) with Admin role

## Implementation Details

### Key Files

1. **`src/routers/auth.py`**:
   - Contains the authentication endpoints
   - Implements Google token verification
   - Handles user creation and token generation

2. **`src/auth/auth.py`**:
   - Contains the JWT token utilities
   - Implements the token verification middleware
   - Provides the admin verification helper

3. **`src/database/models.py`**:
   - Defines the User and AllowedEmail models
   - Sets up relationships between entities

4. **`init_db.py`**:
   - Seeds the initial admin user
   - Adds the admin email to the whitelist

### Key Functions

1. **`google_auth_callback`**:
   - Validates Google tokens
   - Performs email whitelisting checks
   - Manages user creation and updates
   - Generates JWT tokens with role information

2. **`verify_token`**:
   - Validates JWT tokens
   - Extracts user information including role and user_id
   - Verifies user existence and activity status
   - Ensures role in token matches database role

3. **`create_access_token`**:
   - Creates JWT tokens with appropriate claims
   - Sets expiration times
   - Includes role and user_id in the payload

4. **`verify_admin`**:
   - Checks if the current user has Admin role
   - Prevents unauthorized access to admin-only endpoints

## Best Practices

1. **Role Consistency**:
   - The database is the source of truth for user roles
   - Tokens reflect the role at the time of issuance
   - Role checks verify token role against database role

2. **Email Whitelisting**:
   - Performed as the first step in authentication
   - Protects against unauthorized access attempts
   - Whitelisted emails managed by admins only

3. **Error Handling**:
   - Detailed error messages in development
   - Generic security messages in production
   - Proper HTTP status codes for different error conditions

4. **Logging**:
   - Authentication attempts are logged
   - Successful and failed logins are recorded
   - Role changes are tracked

## Future Enhancements

1. **Role-Based UI**:
   - Frontend adjusts based on user role
   - Menu items and actions are role-appropriate

2. **Advanced Permissions**:
   - More granular permission system beyond just "Admin" and "User" roles
   - Permission groups or capabilities

3. **Audit Trail**:
   - Enhanced logging of authentication and authorization events
   - Tracking of role changes and privilege escalations
