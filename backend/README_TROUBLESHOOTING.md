# CIL CBT App Backend Troubleshooting

## Database Migration Instructions - UPDATED JUNE 2025

If you're experiencing issues with "Cannot delete paper with existing sections" errors or other database cascade deletion problems, follow these steps to update your database schema:

### Running Migrations Inside the Docker Container

1. Access the backend container:
   ```
   docker exec -it cil_cbt_app-backend-1 bash
   ```

2. Run the migration script:
   ```
   python run_migrations.py
   ```

Alternatively, you can run the individual Alembic commands:
```
cd src/database
alembic revision --autogenerate -m "Fix cascade delete for papers sections and questions"
alembic upgrade head
```

## Common Issues and Solutions

### 1. Issue: "Cannot delete paper with existing sections. Delete sections first."

**Fixed in June 2025 update**
This error occurred because the Paper deletion endpoint was explicitly checking for and preventing deletion of papers with existing sections, instead of cascading the deletion. The code has been updated to:
1. Allow cascade deletion of sections when a paper is deleted
2. Allow cascade deletion of subsections when a section is deleted
3. Allow cascade deletion of questions when a paper, section, or subsection is deleted

Run the migrations to apply this fix to your database schema.

### 2. Issue: "null value in column 'question_id' of relation 'question_options' violates not-null constraint"

This occurs because the foreign key cascade delete is not properly configured in the database schema.
Run the migrations to fix this issue.

### 3. Issue: "Mapper 'Mapper[Question(questions)]' has no property 'paper'"

This is due to a formatting issue in the SQLAlchemy model definition for the Question class.
The code has been fixed to properly define the relationship between Question and Paper.

### 4. JWT Token Expiration Issues

The system shows many "JWT error during token verification: Signature has expired" messages.
Consider increasing the ACCESS_TOKEN_EXPIRE_MINUTES value in your environment configuration.

## Verifying the Fix

After applying the migrations, perform these steps to verify the fix:

1. **Restart the backend service**:
   ```
   docker-compose -f docker-compose.dev.yml restart backend
   ```

2. **Test paper deletion**:
   - Navigate to the Paper & Section Management page in the frontend
   - Try to delete a paper that has sections
   - The paper should now be deleted successfully along with its sections, subsections, and questions

3. **Check the logs**:
   You should see log messages showing the cascading delete process:
   ```
   Deleting paper X with cascading delete for sections, subsections, and questions
   Paper X has Y sections that will be deleted: [section_ids]
   ```

The application now properly implements cascading relationships between papers, sections, subsections, and questions. This ensures that when you delete a parent item, all related child items are automatically deleted, preventing orphaned data.
