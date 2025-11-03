# Department Forms System Migration

This document describes the migration to the unified department signup forms system.

## Overview

The old system had separate "form fields" and "signup forms" functionality. This has been consolidated into a single "Department Signup Form Editor" where all form fields are managed directly within signup forms.

## Changes Made

### Database Schema Changes

1. **New Table Structure**: `department_signup_forms` table now contains a `form_fields` JSON column that stores all field definitions
2. **Removed Dependencies**: No longer uses the separate `form_fields` table for new forms
3. **Simplified Relationships**: Direct relationship between departments and their signup forms

### Application Changes

1. **Removed Components**: 
   - `FormManagementTab.tsx` - Completely removed
   - Separate form fields management

2. **Updated Components**:
   - `DepartmentSignupFormBuilder.tsx` - Now the single unified form editor
   - `AdminDashboard.tsx` - Removed "Form Fields" tab, renamed "Signup Forms" to "Department Forms"
   - `Onboarding.tsx` - Updated to use the new unified form system

3. **New Features**:
   - Drag-and-drop field ordering
   - Enhanced field validation
   - File upload validation with size and type restrictions
   - Better error handling for missing tables

## How to Apply the Migration

### Step 1: Apply Database Migration

Run the following SQL script in your Supabase SQL Editor:

```sql
-- Copy the contents of: supabase/migrations/20251102074600_unified_department_signup_forms.sql
```

Or if you have Supabase CLI access:

```bash
cd supabase
npx supabase db push
```

### Step 2: Verify the Migration

Check that the following tables exist and have the correct structure:

1. `department_signup_forms` with columns:
   - `id` (UUID, Primary Key)
   - `department_id` (UUID, Foreign Key to departments)
   - `form_name` (TEXT)
   - `form_description` (TEXT, optional)
   - `form_fields` (JSONB)
   - `is_active` (BOOLEAN)
   - `created_by` (UUID, Foreign Key to auth.users)
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

2. `department_signup_form_submissions` with columns:
   - `id` (UUID, Primary Key)
   - `form_id` (UUID, Foreign Key to department_signup_forms)
   - `user_id` (UUID, Foreign Key to auth.users)
   - `submission_data` (JSONB)
   - `submitted_at` (TIMESTAMP)
   - `status` (TEXT)

### Step 3: Test the System

1. **Admin Dashboard**:
   - Go to Admin Dashboard → "Department Forms" tab
   - Select a department
   - Create a new form with various field types
   - Test the drag-and-drop functionality
   - Save and verify the form is stored correctly

2. **User Onboarding**:
   - Go through the onboarding process
   - Select a department that has a form
   - Verify all form fields are displayed correctly
   - Test file upload validation
   - Submit the form and check data is saved

## New Form Field Structure

The `form_fields` JSON column stores an array of field objects with this structure:

```json
[
  {
    "id": "field_id",
    "type": "text|email|phone|dropdown|file",
    "label": "Field Label",
    "required": true,
    "placeholder": "Optional placeholder text",
    "options": ["Option1", "Option2"], // Only for dropdown fields
    "validation": {
      "min": 1,
      "max": 100
    },
    "fileTypes": ["pdf", "docx", "image"], // Only for file fields
    "maxFileSize": 5 // In MB, only for file fields
  }
]
```

## File Upload Validation

The system now includes comprehensive file upload validation:

1. **File Size**: Validates against `maxFileSize` (default 5MB)
2. **File Types**: Validates against `fileTypes` array
3. **Supported Types**: 
   - PDF: `.pdf`
   - DOCX: `.docx`
   - Images: `.jpg`, `.jpeg`, `.png`, `.gif`

## Error Handling

The system includes robust error handling:

1. **Missing Tables**: Gracefully handles cases where the migration hasn't been run
2. **Validation Errors**: Clear error messages for form validation failures
3. **Network Errors**: Proper error reporting for database connection issues

## Backward Compatibility

- Old `form_fields` table is preserved (but not used in the new system)
- Existing data is backed up before migration
- Default forms are created for departments that don't have any

## Troubleshooting

### Issue: "Table does not exist" errors
**Solution**: Run the migration script manually in Supabase SQL Editor

### Issue: Forms not loading
**Solution**: Check that the `department_signup_forms` table exists and has RLS policies

### Issue: File uploads not working
**Solution**: Verify that the storage bucket exists and has proper policies

### Issue: Drag and drop not working
**Solution**: Check that all required dependencies are installed (`@dnd-kit` packages)

## Migration Rollback

If you need to rollback the migration:

1. Restore from the `department_signup_forms_backup` table
2. Update the application code to use the old system
3. Revert the database schema changes

## Support

For any issues with the migration:
1. Check the browser console for error messages
2. Verify the migration was applied correctly
3. Ensure all database permissions are set correctly
4. Test with different departments and form configurations