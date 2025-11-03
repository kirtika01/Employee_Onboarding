-- Add department_id to form_fields table for department-specific forms
ALTER TABLE public.form_fields 
ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE;

-- Update existing form fields to be global (no department association)
UPDATE public.form_fields SET department_id = NULL;

-- Create department_document_templates table for department-specific PDFs and templates
CREATE TABLE public.department_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(department_id, title)
);

-- Enable RLS
ALTER TABLE public.department_document_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for department_document_templates
CREATE POLICY "Admins can manage department document templates"
  ON public.department_document_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their department document templates"
  ON public.department_document_templates FOR SELECT
  USING (
    department_id IN (
      SELECT department_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Update RLS policies for form_fields to support department-specific access
DROP POLICY IF EXISTS "Everyone can view active form fields" ON public.form_fields;
DROP POLICY IF EXISTS "Users can view assigned form fields" ON public.form_fields;

-- New RLS policies for form_fields
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

-- Create trigger for updated_at
CREATE TRIGGER update_department_document_templates_updated_at
  BEFORE UPDATE ON public.department_document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert some department-specific form fields examples
INSERT INTO public.form_fields (field_name, field_label, field_type, is_required, display_order, department_id) VALUES
  ('qualification', 'Educational Qualification', 'text', true, 1, (SELECT id FROM departments WHERE name = 'Educators')),
  ('subject', 'Teaching Subject', 'text', true, 2, (SELECT id FROM departments WHERE name = 'Educators')),
  ('experience', 'Years of Experience', 'text', true, 3, (SELECT id FROM departments WHERE name = 'Educators')),
  ('target_region', 'Target Sales Region', 'text', true, 1, (SELECT id FROM departments WHERE name = 'Sales')),
  ('sales_quota', 'Sales Quota Target', 'text', true, 2, (SELECT id FROM departments WHERE name = 'Sales')),
  ('skillset', 'Technical Skills', 'textarea', true, 1, (SELECT id FROM departments WHERE name = 'IT')),
  ('github_profile', 'GitHub Profile', 'link', false, 2, (SELECT id FROM departments WHERE name = 'IT'));

-- Update the types to include the new department_id column
COMMENT ON COLUMN public.form_fields.department_id IS 'References the department this form field belongs to. NULL means global field.';