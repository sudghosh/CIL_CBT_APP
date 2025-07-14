# Development User Management Guide

## Current Development Setup

### Development User Access
- **Primary Development User**: `binty.ghosh@gmail.com`
  - Role: `Admin`
  - Status: `Active`
  - In Allowed Emails: ✅ Yes
  - Access Level: Full access to all features including personalized performance dashboard

## Adding New Development Users

### Method 1: Database Direct Access (Recommended for Development)

#### Step 1: Add User to Users Table
```sql
-- Connect to database
docker exec -it cil_hr_postgres psql -U cildb -d cil_cbt_db

-- Insert new user (example)
INSERT INTO users (google_id, email, first_name, last_name, role, is_active)
VALUES ('google_id_here', 'new.developer@example.com', 'Developer', 'Name', 'Admin', true);
```

#### Step 2: Add User to Allowed Emails
```sql
-- Add to allowed emails list (get user_id from previous step or query)
INSERT INTO allowed_emails (email, added_by_admin_id, added_at)
VALUES ('new.developer@example.com', 1, NOW());
```

#### Step 3: Verify Access
```sql
-- Verify user setup
SELECT u.user_id, u.email, u.role, u.is_active, ae.email as allowed_email 
FROM users u 
LEFT JOIN allowed_emails ae ON u.email = ae.email 
WHERE u.email = 'new.developer@example.com';
```

### Method 2: Admin Interface (Future Enhancement)

The system can be enhanced with an admin panel at `/admin/users` for:
- Adding new users to allowed emails list
- Managing user roles and permissions
- Viewing user access status

## Authentication Flow

### For Performance Dashboard Access:
1. User must authenticate via Google OAuth
2. User's email must exist in `users` table
3. User must be active (`is_active = true`)
4. For personalized features, user's email must be in `allowed_emails` table

### Access Levels:
- **All Authenticated Users**: Can access basic performance data
- **Allowed Users**: Can access personalized recommendations, comparisons, and detailed analytics
- **Admin Users**: Can access all features (future: user management)

## Environment Variables

Ensure these are set in your environment:
```bash
DATABASE_URL=postgresql://cildb:your_password@localhost:5432/cil_cbt_db
SECRET_KEY=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Troubleshooting

### User Can't Access Performance Dashboard:
1. Check if user is in `users` table
2. Verify user is active (`is_active = true`)
3. For personalized features, check `allowed_emails` table
4. Verify JWT token is valid

### Adding Users via SQL:
```sql
-- Check current allowed users
SELECT * FROM allowed_emails;

-- Check user status
SELECT user_id, email, role, is_active FROM users WHERE email = 'user@example.com';

-- Add user to allowed list
INSERT INTO allowed_emails (email, added_by_admin_id) 
VALUES ('user@example.com', 1);
```

## Quick Commands for Development

### Check Database Status:
```bash
cd "C:\Users\Sudipto\Desktop\CIL HR EXAM\Question_Bank"
docker exec -it cil_hr_postgres psql -U cildb -d cil_cbt_db -c "SELECT COUNT(*) as total_users FROM users;"
docker exec -it cil_hr_postgres psql -U cildb -d cil_cbt_db -c "SELECT COUNT(*) as allowed_users FROM allowed_emails;"
```

### Add Development User (Template):
```bash
# Replace with actual user details
docker exec -it cil_hr_postgres psql -U cildb -d cil_cbt_db -c "
INSERT INTO users (google_id, email, first_name, last_name, role, is_active)
VALUES ('dev_google_id', 'dev@example.com', 'Dev', 'User', 'Admin', true);
"

docker exec -it cil_hr_postgres psql -U cildb -d cil_cbt_db -c "
INSERT INTO allowed_emails (email, added_by_admin_id)
VALUES ('dev@example.com', 1);
"
```

## Current Status (as of June 26, 2025)

- ✅ Primary development user (`binty.ghosh@gmail.com`) properly configured
- ✅ Authentication system working correctly
- ✅ Performance dashboard accessible to allowed users
- ✅ Real-time data processing operational
- ✅ Robust error handling implemented

## Future Enhancements

1. **Admin Panel**: Web interface for user management
2. **Bulk User Import**: CSV upload for multiple users
3. **Role-Based Permissions**: More granular access control
4. **User Self-Registration**: With admin approval workflow
5. **Audit Logging**: Track user access and permission changes
