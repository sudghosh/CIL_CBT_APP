# Paper Cascade Deletion Fix

## Overview

This document explains the fix implemented in June 2025 to address cascading deletion issues in the Paper & Section Management functionality of the CIL CBT App.

## Problem Description

The application was experiencing an issue where attempting to delete papers would fail with a 400 Bad Request error and message "Cannot delete paper with existing sections. Delete sections first". This was because the delete endpoints were explicitly checking for related entities and preventing deletion if they existed.

The expected behavior was for deletion to cascade automatically, meaning that when a paper is deleted:
1. All sections related to that paper should be automatically deleted
2. All subsections related to those sections should be automatically deleted
3. All questions related to the paper, sections, and subsections should be automatically deleted

## Changes Implemented

### 1. Modified Router Endpoints

#### Papers Router (`papers.py`)
- Removed the check that prevented deletion of papers with existing sections
- Added logging of cascade deletion process
- Allows papers to be deleted even when they have sections

#### Sections Router (`sections.py`)
- Removed the check that prevented deletion of sections with existing subsections
- Added logging of cascade deletion process
- Allows sections to be deleted even when they have subsections

### 2. Updated SQLAlchemy Models

#### Paper Model
- Already had cascade="all, delete-orphan" relationship with questions

#### Section Model
- Added ondelete="CASCADE" to the ForeignKey for paper_id
- Added cascade="all, delete-orphan" to the relationship with subsections
- Added cascade="all, delete-orphan" to the relationship with questions

#### Subsection Model
- Added ondelete="CASCADE" to the ForeignKey for section_id
- Added cascade="all, delete-orphan" to the relationship with questions

### 3. Database Migration

Created a new database migration that updates the database schema to reflect these changes, including:
- Adding ON DELETE CASCADE constraints to foreign keys
- Ensuring proper triggers for cascade deletion

## Testing the Fix

To verify the fix works correctly:

1. Try deleting a paper that has sections, subsections, and questions
2. Verify that all related entities are deleted in the database
3. Check the backend logs to see the cascade deletion process

## Technical Details

### SQLAlchemy Cascade Options

- `cascade="all, delete-orphan"`: When a parent object is deleted, delete all related child objects
- `ondelete="CASCADE"`: When a parent record is deleted, delete all related child records in the database

### Database Schema

The updated database schema ensures referential integrity while allowing cascading deletions through the use of PostgreSQL's ON DELETE CASCADE constraints.

## Conclusion

This fix ensures that hierarchical data in the application is properly managed during deletion operations, preventing orphaned records and allowing for more intuitive paper and section management.
