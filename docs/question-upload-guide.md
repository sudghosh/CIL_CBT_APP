# Question Upload Documentation

## File Requirements

The question upload feature requires a specific CSV or Excel format. Here are the key requirements:

1. **Required Format**: CSV (.csv) or Excel (.xlsx) file
2. **Required Columns**:
   - question_text: The full question text
   - question_type: "MCQ" or "True/False"
   - default_difficulty_level: "Easy", "Medium", or "Hard"
   - paper_id: Must correspond to an existing paper ID in the system
   - section_id: Must correspond to an existing section ID in the system
   - correct_option_index: 0 for option_0, 1 for option_1, etc.
   - option_0, option_1, option_2, option_3: Answer options (for MCQ)

3. **Optional Columns**:
   - subsection_id: ID of a subsection if applicable
   - explanation: Explanation of the correct answer
   - valid_until: Date until which the question is valid (format: DD-MM-YYYY)

## Common Issues

1. **422 Unprocessable Entity Error**:
   - Indicates validation issues with the file content
   - Most likely cause: The file has data that doesn't fit the expected validation rules
   - Check for any special characters or formatting issues in your data
   - Ensure dates are in correct DD-MM-YYYY format

2. **400 Bad Request Error**:
   - Indicates missing required columns or invalid data structure
   - Make sure all required columns are present and match the exact names in the template
   - Verify that no columns have been renamed or deleted

3. **Empty File**:
   - The application will reject empty files with a clear error message
   - Make sure you've added question data to the template

4. **File Encoding Issues**:
   - CSV files should be saved using UTF-8 encoding
   - If you edited the file with Excel, make sure to save it as CSV UTF-8

5. **Excel Format Issues**:
   - When saving from Excel, choose "CSV (Comma delimited)" format
   - Watch out for Excel autocorrecting data (like dates)

## Detailed Troubleshooting Steps

1. **Start with a fresh template**:
   - Always download a fresh template from the UI for each new upload
   - Don't reuse old templates that might have hidden formatting issues

2. **File Preparation**:
   - Fill in data without modifying header row (first row)
   - Don't add extra columns
   - For MCQ questions, ensure all 4 options have values
   - For True/False questions, only fill option_0 and option_1
   - Verify paper_id and section_id exist in the system

3. **CSV Editing Tips**:
   - If using Excel:
     - Save as "CSV (Comma delimited)"
     - If prompted about features not compatible with CSV, click "Yes"
   - If using a text editor:
     - Ensure commas separate each column value
     - Use quotes around text with commas (e.g. "This is, an example")

4. **Console Debugging**:
   - Open browser developer tools (F12) before uploading
   - Check for detailed error messages in the Console tab
   - Look specifically for validation errors that identify problem rows

## Solution to 422 Errors

For validation failures (422 errors):

1. **Check your data content**:
   - Look for invalid characters or formatting
   - Ensure dates follow DD-MM-YYYY format
   - Verify numeric fields contain only numbers

2. **Verify real paper_id and section_id**:
   - These must match existing IDs in the database
   - Use the Papers management page to find valid IDs

3. **Template matching**:
   - The backend strictly validates against expected columns
   - Any deviation from the template structure will cause errors
   - Download a fresh template if needed

## Upload Process

1. **Navigate to the Question Management page**:
   - Access the Question Management page through the main navigation
   
2. **Locate the Upload Option**:
   - The "Upload CSV" button is located in the search filters section at the top of the page
   
3. **Select and Upload File**:
   - Click "Upload CSV" button
   - Select your prepared CSV or Excel file
   - The system will validate the file and display any errors
   
4. **Verify Upload**:
   - Upon successful upload, questions will appear in the question list
   - Use the search filters to find your newly added questions

This documentation is current as of June 13, 2025 and reflects the updated UI with the "Question Management" title and "Add Question" button placed at the top of the page.
