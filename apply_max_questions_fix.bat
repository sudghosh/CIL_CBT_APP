@echo off
REM Run migration script to add the max_questions column to test_attempts table
echo Running migration to add max_questions column...
cd backend
python add_max_questions_column.py

if %ERRORLEVEL% NEQ 0 (
  echo Migration failed! Please check the error message above.
  exit /b %ERRORLEVEL%
)

echo Migration completed successfully!
echo.
echo Restarting the backend service...

REM Run the restart script for the backend if it exists
if exist restart_backend.ps1 (
  powershell -ExecutionPolicy Bypass -File restart_backend.ps1
  echo Backend service restarted.
) else (
  echo No restart script found. Please restart the backend service manually.
)

echo.
echo Fix deployment complete! You can now try starting tests again.
pause
