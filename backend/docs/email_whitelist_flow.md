# Email Whitelist Management Workflow Documentation

This document describes the complete workflow for managing whitelisted emails in the CIL HR Exam application, from frontend user interactions to database operations and back.

## Overview

The email whitelist functionality allows administrators to control which email addresses are permitted to register and use the application. This feature is critical for maintaining security and limiting access to authorized personnel only.

## Frontend to Database Flow (Adding Emails)

### User Interaction
**Filename:** `frontend/src/pages/UserManagement.tsx`
**Function:** `handleWhitelistEmail()`

```typescript
const handleWhitelistEmail = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  
  try {
    // Frontend validation
    if (!emailToWhitelist || !emailToWhitelist.includes('@') || !emailToWhitelist.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }
    
    // API call to backend
    const response = await axios.post(
      `${API_BASE_URL}/admin/allowed-emails`,
      { email: emailToWhitelist },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.status === 201) {
      toast.success('Email whitelisted successfully');
      setEmailToWhitelist('');
      // Refresh the whitelist
      fetchAllowedEmails();
    }
  } catch (error) {
    // Error handling
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      if (statusCode === 401 || statusCode === 403) {
        setError('You are not authorized to perform this action');
      } else if (statusCode === 422) {
        setError('Invalid email format');
      } else {
        setError(`Failed to whitelist email: ${error.response?.data?.detail || 'Unknown error'}`);
      }
    } else {
      setError('An unexpected error occurred');
    }
  } finally {
    setIsSubmitting(false);
  }
};
```

### Backend Processing
**Filename:** `backend/src/routers/admin.py`
**Function:** `add_allowed_email()`
**API Endpoint:** `POST /admin/allowed-emails`

```python
@router.post("/allowed-emails", status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def add_allowed_email(
    request: Request,
    email_data: AllowedEmailCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Log the incoming request for debugging
        logger.info(f"Received whitelist request for email: {email_data.email}")
        
        # Additional email validation
        if not "@" in email_data.email or not "." in email_data.email:
            logger.warning(f"Invalid email format received: {email_data.email}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid email format: {email_data.email}. Please provide a valid email address."
            )
            
        # Check if email already exists
        existing_email = db.query(AllowedEmail).filter(AllowedEmail.email == email_data.email).first()
        if existing_email:
            logger.info(f"Email {email_data.email} is already whitelisted")
            return {"status": "success", "message": f"Email {email_data.email} is already whitelisted"}

        # Create new allowed email entry
        allowed_email = AllowedEmail(
            email=email_data.email,
            added_by_admin_id=current_user.user_id
        )
        db.add(allowed_email)
        db.commit()
        db.refresh(allowed_email)
        
        logger.info(f"Email {email_data.email} whitelisted by admin {current_user.email}")
        return {"status": "success", "message": f"Email {email_data.email} whitelisted successfully"}
    
    except HTTPException as e:
        # Re-raise HTTP exceptions to maintain their status codes and details
        raise e
    except Exception as e:
        logger.error(f"Error adding allowed email: {e}")
        db.rollback()
        raise APIErrorHandler.handle_db_error(e, "adding allowed email")
```

### Database Interaction
**Filename:** `backend/src/database/models.py`
**Model:** `AllowedEmail`

```python
class AllowedEmail(Base):
    __tablename__ = "allowed_emails"

    allowed_email_id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    added_by_admin_id = Column(Integer, ForeignKey("users.user_id"))
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    added_by = relationship("User")
```

## Database to Frontend Flow (Retrieving Emails)

### Backend Processing
**Filename:** `backend/src/routers/admin.py`
**Function:** `list_allowed_emails()`
**API Endpoint:** `GET /admin/allowed-emails`

```python
@router.get("/allowed-emails", response_model=List[AllowedEmailResponse])
@limiter.limit("30/minute")
async def list_allowed_emails(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        logger.info(f"Fetching allowed emails with skip={skip} and limit={limit}")
        allowed_emails = db.query(AllowedEmail).offset(skip).limit(limit).all()
        logger.info(f"Found {len(allowed_emails)} allowed emails")
        
        return allowed_emails
    except Exception as e:
        logger.error(f"Error listing allowed emails: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise APIErrorHandler.handle_db_error(e, "listing allowed emails")
```

### Frontend Display
**Filename:** `frontend/src/pages/UserManagement.tsx`
**Function:** `fetchAllowedEmails()`

```typescript
const fetchAllowedEmails = async () => {
  setIsLoading(true);
  
  try {
    const response = await axios.get(
      `${API_BASE_URL}/admin/allowed-emails`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.status === 200) {
      setAllowedEmails(response.data);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      if (statusCode === 401 || statusCode === 403) {
        setError('You are not authorized to view this data');
      } else {
        setError(`Failed to fetch whitelisted emails: ${error.response?.data?.detail || 'Unknown error'}`);
      }
    } else {
      setError('An unexpected error occurred while fetching data');
    }
    setAllowedEmails([]);
  } finally {
    setIsLoading(false);
  }
};
```

**Function:** `renderAllowedEmailsTable()`

```typescript
const renderAllowedEmailsTable = () => {
  return (
    <Table striped bordered hover>
      <thead>
        <tr>
          <th>Email</th>
          <th>Added By</th>
          <th>Added At</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {allowedEmails.map((email) => (
          <tr key={email.allowed_email_id}>
            <td>{email.email}</td>
            <td>{email.added_by_admin_id}</td>
            <td>{new Date(email.added_at).toLocaleString()}</td>
            <td>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDeleteEmail(email.allowed_email_id)}
                disabled={isDeleting}
              >
                {isDeleting === email.allowed_email_id ? 'Deleting...' : 'Remove'}
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};
```

## Deletion Flow

### Frontend Interaction
**Filename:** `frontend/src/pages/UserManagement.tsx`
**Function:** `handleDeleteEmail()`

```typescript
const handleDeleteEmail = async (emailId: number) => {
  // Set the email currently being deleted for UI feedback
  setIsDeleting(emailId);
  
  try {
    // Confirmation dialog
    if (!window.confirm('Are you sure you want to remove this email from the whitelist?')) {
      setIsDeleting(null);
      return;
    }
    
    // API call to delete
    const response = await axios.delete(
      `${API_BASE_URL}/admin/allowed-emails/${emailId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.status === 200) {
      toast.success('Email removed from whitelist successfully');
      // Refresh the list
      fetchAllowedEmails();
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      if (statusCode === 401 || statusCode === 403) {
        setError('You are not authorized to perform this action');
      } else if (statusCode === 404) {
        setError('Email not found in whitelist');
        // Refresh the list to ensure UI is in sync
        fetchAllowedEmails();
      } else {
        setError(`Failed to remove email: ${error.response?.data?.detail || 'Unknown error'}`);
      }
    } else {
      setError('An unexpected error occurred');
    }
  } finally {
    setIsDeleting(null);
  }
};
```

### Backend Processing
**Filename:** `backend/src/routers/admin.py`
**Function:** `delete_allowed_email()`
**API Endpoint:** `DELETE /admin/allowed-emails/{allowed_email_id}`

```python
@router.delete("/allowed-emails/{allowed_email_id}", status_code=status.HTTP_200_OK)
@limiter.limit("20/minute")
async def delete_allowed_email(
    request: Request,
    allowed_email_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_admin)
):
    try:
        # Check if email exists
        allowed_email = db.query(AllowedEmail).filter(AllowedEmail.allowed_email_id == allowed_email_id).first()
        if not allowed_email:
            logger.warning(f"Attempted to delete non-existent allowed email ID: {allowed_email_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Allowed email with ID {allowed_email_id} not found"
            )

        # Delete the email
        db.delete(allowed_email)
        db.commit()
        
        logger.info(f"Email {allowed_email.email} removed from whitelist by admin {current_user.email}")
        return {"status": "success", "message": f"Email {allowed_email.email} removed from whitelist successfully"}
    
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error deleting allowed email: {e}")
        db.rollback()
        raise APIErrorHandler.handle_db_error(e, "deleting allowed email")
```

## Error Handling Strategy

### Frontend Error Handling

1. **Input Validation:**
   - Email format is validated on the client side before making API calls.
   - Form submission is disabled during API requests to prevent duplicate submissions.

2. **API Error Handling:**
   - Uses try/catch blocks around all API calls.
   - Specific error handling for different HTTP status codes (401, 403, 404, 422, etc.).
   - User-friendly error messages are displayed based on the error type.
   - Uses toast notifications for success messages.

3. **Loading States:**
   - Maintains loading states for data fetching, submission, and deletion operations.
   - Provides visual feedback to users during asynchronous operations.

### Backend Error Handling

1. **Input Validation:**
   - Uses Pydantic models (`AllowedEmailCreate`) for validation of incoming data.
   - Additional custom validation (e.g., checking email format).
   - Returns 422 Unprocessable Entity for validation failures.

2. **Authentication & Authorization:**
   - Uses the `verify_admin` dependency to ensure only admin users can access these endpoints.
   - Returns 401 Unauthorized or 403 Forbidden for authentication/authorization failures.

3. **Database Error Handling:**
   - Wraps database operations in try/except blocks.
   - Logs detailed error information, including tracebacks.
   - Uses `APIErrorHandler` utility to handle different types of database errors.
   - Rolls back transactions on error to maintain database integrity.

4. **Rate Limiting:**
   - Uses the `limiter` to prevent abuse of the API.
   - Limits are set to 20 requests per minute for POST/DELETE and 30 requests per minute for GET operations.

5. **Resource Not Found:**
   - Returns 404 Not Found with descriptive messages when attempting to access non-existent resources.

## Integration Points

1. **Authentication Flow:**
   - All API endpoints require a valid authentication token.
   - The `verify_admin` dependency ensures only users with admin role can access these endpoints.

2. **User Management Interface:**
   - The whitelist functionality is integrated into the broader user management interface.
   - Component loads upon initial render and automatically refreshes after successful operations.

3. **Error Handler Utility:**
   - Uses a centralized `APIErrorHandler` class for consistent error handling across the application.
   - Provides standardized error responses with appropriate HTTP status codes.

4. **Logging:**
   - Comprehensive logging throughout the process for debugging and audit purposes.
   - Logs include user actions, critical errors, and important system events.
