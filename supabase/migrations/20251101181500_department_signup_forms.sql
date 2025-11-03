-- Create department_signup_forms table for storing form configurations
CREATE TABLE public.department_signup_forms (
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

-- Create department_signup_form_submissions table for storing form submissions
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

-- RLS Policies for department_signup_forms
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

-- RLS Policies for department_signup_form_submissions
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

-- Comments for documentation
COMMENT ON TABLE public.department_signup_forms IS 'Stores customized signup form configurations for each department';
COMMENT ON COLUMN public.department_signup_forms.form_config IS 'JSON configuration of form fields including types, validation, and arrangement';
COMMENT ON TABLE public.department_signup_form_submissions IS 'Stores user submissions for department signup forms';
COMMENT ON COLUMN public.department_signup_form_submissions.submission_data IS 'JSON data containing the actual form submission values';