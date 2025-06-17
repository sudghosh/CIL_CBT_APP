# API Services Documentation

## Overview

This document provides detailed information about the API services available in the CIL CBT App frontend application. These services act as an abstraction layer between the frontend components and the backend API endpoints.

## API Structure

The API services are organized into logical groups based on their domain:

1. **authAPI** - Authentication and user management
2. **papersAPI** - Exam paper management
3. **sectionsAPI** - Section management
4. **subsectionsAPI** - Subsection management
5. **questionsAPI** - Question management
6. **testsAPI** - Test and template management
7. **performanceAPI** - Performance metrics and analytics

## Common Service Patterns

All API services follow consistent patterns:

1. **Response Format**: All API calls return a Promise with a standardized response structure:
   ```typescript
   {
     data: any;       // The data returned by the API
     success: boolean; // Whether the request was successful
   }
   ```

2. **Error Handling**: All API calls include proper error handling and will throw standardized `APIError` instances.

3. **Retry Mechanism**: Critical API endpoints use the `axiosWithRetry` utility to automatically retry failed requests.

4. **Mock Data**: In development mode, most API services will fall back to mock data if the API call fails.

## Service Documentation

### papersAPI

```typescript
// Get all papers with optional pagination
papersAPI.getPapers({ page: 1, page_size: 10 });

// Create a new paper
papersAPI.createPaper({
  paper_name: "Sample Paper",
  total_marks: 100,
  description: "Sample paper description",
  sections: []
});

// Update an existing paper
papersAPI.updatePaper(1, {
  paper_name: "Updated Paper Name",
  total_marks: 150,
  description: "Updated description"
});

// Delete a paper
papersAPI.deletePaper(1);

// Activate a paper
papersAPI.activatePaper(1);

// Deactivate a paper
papersAPI.deactivatePaper(1);

// Create a sample paper for testing
papersAPI.createSamplePaper();
```

### sectionsAPI

```typescript
// Get all sections for a specific paper
sectionsAPI.getSectionsByPaperId(1);

// Create a new section
sectionsAPI.createSection({
  section_name: "General Knowledge",
  paper_id: 1,
  marks_allocated: 25,
  description: "General knowledge section"
});

// Update an existing section
sectionsAPI.updateSection(1, {
  section_name: "Updated Section Name",
  marks_allocated: 30,
  description: "Updated description"
});

// Delete a section
sectionsAPI.deleteSection(1);
```

### subsectionsAPI

```typescript
// Get all subsections for a specific section
subsectionsAPI.getSubsections(1);

// Create a new subsection
subsectionsAPI.createSubsection({
  subsection_name: "Basic Questions",
  section_id: 1,
  description: "Basic level questions"
});

// Update an existing subsection
subsectionsAPI.updateSubsection(1, {
  subsection_name: "Updated Subsection Name",
  description: "Updated description"
});

// Delete a subsection
subsectionsAPI.deleteSubsection(1);
```

## Best Practices for Using API Services

1. **Error Handling**: Always wrap API calls in try/catch blocks to handle errors gracefully:
   ```typescript
   try {
     const response = await papersAPI.getPapers();
     // Handle success
   } catch (error) {
     // Handle error
     console.error('Failed to fetch papers:', error);
   }
   ```

2. **Loading States**: Use loading states to improve user experience:
   ```typescript
   const [loading, setLoading] = useState(true);
   
   useEffect(() => {
     const fetchData = async () => {
       setLoading(true);
       try {
         const response = await papersAPI.getPapers();
         // Process data
       } catch (error) {
         // Handle error
       } finally {
         setLoading(false);
       }
     };
     
     fetchData();
   }, []);
   ```

3. **Type Safety**: Use TypeScript type assertions when processing API responses:
   ```typescript
   const response = await papersAPI.getPapers();
   const papers = response.data as ExamPaper[];
   ```

## Extending API Services

When adding new API endpoints:

1. Add the new method to the appropriate API service
2. Follow the existing pattern of try/catch and error handling
3. Include appropriate JSDoc comments
4. Add mock data for development mode if appropriate
5. Update this documentation

## Troubleshooting

Common issues:

1. **Authentication Errors**: 401 errors usually indicate that the auth token is expired. The user will be redirected to login.

2. **Not Found Errors**: 404 errors usually indicate that the requested resource doesn't exist.

3. **Validation Errors**: 422 errors indicate that the data sent to the API was invalid.

4. **Server Errors**: 500 errors indicate a server-side issue.

For all errors, detailed information is logged to the console in development mode.
