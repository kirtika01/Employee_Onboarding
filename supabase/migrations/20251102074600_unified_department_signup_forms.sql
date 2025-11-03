-- Create unified department_signup_forms table structure
-- This migration consolidates form fields directly into the signup forms

-- First, let's create a backup of existing data if needed
CREATE TABLE IF NOT EXISTS department_signup_forms_backup AS 
SELECT * FROM department_signup_forms;

-- Drop the existing department_signup_forms table if it exists
DROP TABLE IF EXISTS public.department_signup_forms CASCADE;

-- Create the new unified department_signup_forms table
CREATE TABLE public.department_signup_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL,
  form_description TEXT,
  form_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(department_id, form_name)
);

-- Drop the old department_signup_form_submissions table if it exists
DROP TABLE IF EXISTS public.department_signup_form_submissions CASCADE;

-- Create the new department_signup_form_submissions table
CREATE TABLE public.department_signup_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.department_signup_forms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Enable RLS
ALTER TABLE public.department_signup_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_signup_form_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for department_signup_forms
CREATE POLICY "Admins can manage department signup forms"
  ON public.department_signup_forms FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their department signup forms"
  ON public.department_signup_forms FOR SELECT
  USING (
    department_id IN (
      SELECT department_id FROM public.profiles WHERE id = auth.uid()
    ) AND is_active = true
  );

-- Create RLS Policies for department_signup_form_submissions
CREATE POLICY "Admins can manage all form submissions"
  ON public.department_signup_form_submissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own submissions"
  ON public.department_signup_form_submissions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create submissions"
  ON public.department_signup_form_submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER update_department_signup_forms_updated_at
  BEFORE UPDATE ON public.department_signup_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_department_signup_forms_department_id ON public.department_signup_forms(department_id);
CREATE INDEX idx_department_signup_forms_is_active ON public.department_signup_forms(is_active);
CREATE INDEX idx_department_signup_form_submissions_form_id ON public.department_signup_form_submissions(form_id);
CREATE INDEX idx_department_signup_form_submissions_user_id ON public.department_signup_form_submissions(user_id);

-- Insert default forms for each department if they don't exist
INSERT INTO public.department_signup_forms (department_id, form_name, form_description, form_fields)
SELECT 
  d.id,
  'Department Signup Form',
  'Default signup form for ' || d.name,
  '[
    {
      "id": "full_name",
      "type": "text",
      "label": "Full Name",
      "required": true,
      "placeholder": "Enter your full name"
    },
    {
      "id": "email",
      "type": "email",
      "label": "Email Address",
      "required": true,
      "placeholder": "Enter your email address"
    },
    {
      "id": "phone",
      "type": "phone",
      "label": "Phone Number",
      "required": false,
      "placeholder": "Enter your phone number"
    },
    {
      "id": "resume",
      "type": "file",
      "label": "Resume",
      "required": false,
      "fileTypes": ["pdf", "docx"],
      "maxFileSize": 5
    }
  ]'::jsonb
FROM public.departments d
WHERE NOT EXISTS (
  SELECT 1 FROM public.department_signup_forms WHERE department_id = d.id
);

-- Add comments for documentation
COMMENT ON TABLE public.department_signup_forms IS 'Stores unified signup form configurations with embedded field definitions for each department';
COMMENT ON COLUMN public.department_signup_forms.form_fields IS 'JSON array containing field definitions (type, label, required, options, file constraints, etc.)';
COMMENT ON TABLE public.department_signup_form_submissions IS 'Stores user submissions for department signup forms';
COMMENT ON COLUMN public.department_signup_form_submissions.submission_data IS 'JSON data containing the actual form submission values including file paths';

-- Note: We're keeping the old form_fields table for now but it won't be used in the new system
-- It can be dropped later after confirming the new system works properly