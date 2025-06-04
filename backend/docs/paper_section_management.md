# Paper and Section Management

## Overview

The Paper and Section Management module allows administrators to create and manage exam papers, sections, and subsections. This is a critical component of the CIL CBT App, providing the structure for organizing questions and creating exams.

## Key Features

1. **Paper Management**
   - Create new exam papers with metadata (name, total marks, description)
   - Activate/deactivate papers
   - View all existing papers in an organized layout

2. **Section Management**
   - Add multiple sections to each paper
   - Configure section details (name, marks allocated, description)
   - Organize questions within appropriate sections

3. **Subsection Management**
   - Create subsections within sections for more granular organization
   - Add descriptive information to subsections

## User Interface

The Paper Management interface provides an intuitive UI with the following components:

- **Paper List**: Displays all available papers with expandable sections showing details
- **Add Paper Button**: Opens a form to create a new paper
- **Paper Details**: Shows paper name, total marks, description, and status
- **Section Accordion**: Expands to show sections within each paper
- **Subsection Table**: Lists subsections within each section

## Workflow

### Creating a New Paper

1. Navigate to the "Papers & Sections" page from the sidebar
2. Click the "Add Paper" button
3. Fill in the paper details:
   - Paper Name (required)
   - Total Marks (required)
   - Description (optional)
4. Add one or more sections:
   - Section Name (required)
   - Marks Allocated (required)
   - Description (optional)
5. Add subsections to each section if needed:
   - Subsection Name (required)
   - Description (optional)
6. Click "Create" to save the paper

### Managing Existing Papers

1. View all papers in the main list
2. Use the activation toggle to activate or deactivate papers
3. Expand sections to view their details and subsections

## API Endpoints

The module interacts with the following API endpoints:

- `GET /papers`: Retrieve all papers with their sections and subsections
- `POST /papers`: Create a new paper with sections and subsections
- `PUT /papers/{paper_id}/activate`: Activate a paper
- `PUT /papers/{paper_id}/deactivate`: Deactivate a paper

## Data Structure

The Paper-Section structure follows this hierarchy:

```
Paper
  └─ Sections
       └─ Subsections
```

Where:
- A Paper contains multiple Sections
- Each Section can contain multiple Subsections
- Questions are associated with Sections (and optionally Subsections)

## Best Practices

1. **Naming Conventions**
   - Use clear, descriptive names for papers and sections
   - Follow a consistent naming pattern for related papers

2. **Marks Allocation**
   - Ensure the sum of section marks equals the total paper marks
   - Distribute marks appropriately across sections

3. **Organization**
   - Create logical groupings of sections for better question organization
   - Use subsections for more detailed categorization

## Integration with Question Management

The Paper and Section Management module is tightly integrated with the Question Management system:

- Questions are created within the context of a specific paper and section
- When adding questions, users select from available papers and sections
- Question filters can be applied based on paper and section
