-- Fix schema issues and ensure all tables are properly set up

-- Ensure form_fields table has the correct structure
DO $$
BEGIN
    -- Check if department_id column exists in form_fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_fields' AND column_name = 'department_id'
    ) THEN
        ALTER TABLE public.form_fields 
        ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE;
        
        -- Update existing form fields to be global (no department association)
        UPDATE public.form_fields SET department_id = NULL WHERE department_id IS NULL;
    END IF;
END $$;

-- Ensure all required indexes exist
CREATE INDEX IF NOT EXISTS idx_form_fields_department_id ON public.form_fields(department_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_is_active ON public.form_fields(is_active);
CREATE INDEX IF NOT EXISTS idx_form_fields_display_order ON public.form_fields(display_order);

-- Ensure department_signup_forms table exists and has correct structure
CREATE TABLE IF NOT EXISTS public.department_signup_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL,
  form_description TEXT,
  form_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(department_id, form_name)
);

-- Ensure department_signup_form_submissions table exists
CREATE TABLE IF NOT EXISTS public.department_signup_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.department_signup_forms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Enable RLS if not already enabled
ALTER TABLE public.department_signup_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_signup_form_submissions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Admins can manage department signup forms" ON public.department_signup_forms;
DROP POLICY IF EXISTS "Users can view their department signup forms" ON public.department_signup_forms;

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

-- Drop and recreate submission policies
DROP POLICY IF EXISTS "Admins can manage all form submissions" ON public.department_signup_form_submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.department_signup_form_submissions;
DROP POLICY IF EXISTS "Users can create submissions" ON public.department_signup_form_submissions;

CREATE POLICY "Admins can manage all form submissions"
  ON public.department_signup_form_submissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own submissions"
  ON public.department_signup_form_submissions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create submissions"
  ON public.department_signup_form_submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Ensure triggers exist
DROP TRIGGER IF EXISTS update_department_signup_forms_updated_at ON public.department_signup_forms;
CREATE TRIGGER update_department_signup_forms_updated_at
  BEFORE UPDATE ON public.department_signup_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Ensure indexes exist for department_signup_forms
CREATE INDEX IF NOT EXISTS idx_department_signup_forms_department_id ON public.department_signup_forms(department_id);
CREATE INDEX IF NOT EXISTS idx_department_signup_forms_is_active ON public.department_signup_forms(is_active);
CREATE INDEX IF NOT EXISTS idx_department_signup_form_submissions_form_id ON public.department_signup_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_department_signup_form_submissions_user_id ON public.department_signup_form_submissions(user_id);

-- Update form_fields RLS policies to ensure they work correctly
DROP POLICY IF EXISTS "Admins can manage all form fields" ON public.form_fields;
DROP POLICY IF EXISTS "Users can view global form fields" ON public.form_fields;
DROP POLICY IF EXISTS "Users can view their department form fields" ON public.form_fields;

CREATE POLICY "Admins can manage all form fields"
  ON public.form_fields FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view global form fields"
  ON public.form_fields FOR SELECT
  USING (department_id IS NULL AND is_active = true);

CREATE POLICY "Users can view their department form fields"
  ON public.form_fields FOR SELECT
  USING (
    department_id IN (
      SELECT department_id FROM public.profiles WHERE id = auth.uid()
    ) AND is_active = true
  );

-- Insert some default global form fields if they don't exist
INSERT INTO public.form_fields (field_name, field_label, field_type, is_required, display_order, department_id)
SELECT 
  'full_name', 'Full Name', 'text', true, 1, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_fields WHERE field_name = 'full_name' AND department_id IS NULL
);

INSERT INTO public.form_fields (field_name, field_label, field_type, is_required, display_order, department_id)
SELECT 
  'email', 'Email Address', 'email', true, 2, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_fields WHERE field_name = 'email' AND department_id IS NULL
);

INSERT INTO public.form_fields (field_name, field_label, field_type, is_required, display_order, department_id)
SELECT 
  'phone_number', 'Phone Number', 'text', false, 3, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.form_fields WHERE field_name = 'phone_number' AND department_id IS NULL
);

-- Add comments for documentation
COMMENT ON TABLE public.department_signup_forms IS 'Stores customized signup form configurations for each department';
COMMENT ON COLUMN public.department_signup_forms.form_config IS 'JSON configuration of form fields including types, validation, and arrangement';
COMMENT ON TABLE public.department_signup_form_submissions IS 'Stores user submissions for department signup forms';
COMMENT ON COLUMN public.department_signup_form_submissions.submission_data IS 'JSON data containing the actual form submission values';
COMMENT ON COLUMN public.form_fields.department_id IS 'References the department this form field belongs to. NULL means global field.';