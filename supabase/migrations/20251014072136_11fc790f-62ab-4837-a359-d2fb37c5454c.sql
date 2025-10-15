-- Create form_fields table for dynamic onboarding form management
CREATE TABLE public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL, -- 'text', 'file', 'link', 'textarea', 'select'
  is_required BOOLEAN DEFAULT false,
  field_options JSONB DEFAULT '[]'::jsonb, -- for select fields
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create training_sessions table
CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL, -- 'youtube', 'pdf', 'drive', 'file', 'external'
  resource_url TEXT,
  duration_minutes INTEGER,
  is_mandatory BOOLEAN DEFAULT false,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create training_progress table to track user completion
CREATE TABLE public.training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE NOT NULL,
  progress_percentage INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, training_session_id)
);

-- Enable RLS
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form_fields
CREATE POLICY "Admins can manage form fields"
  ON public.form_fields FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view active form fields"
  ON public.form_fields FOR SELECT
  USING (is_active = true);

-- RLS Policies for training_sessions
CREATE POLICY "Admins can manage training sessions"
  ON public.training_sessions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their department training sessions"
  ON public.training_sessions FOR SELECT
  USING (
    department_id IS NULL OR 
    department_id IN (
      SELECT department_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for training_progress
CREATE POLICY "Admins can view all training progress"
  ON public.training_progress FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own training progress"
  ON public.training_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own training progress"
  ON public.training_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training progress"
  ON public.training_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_form_fields_updated_at
  BEFORE UPDATE ON public.form_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_training_sessions_updated_at
  BEFORE UPDATE ON public.training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default form fields
INSERT INTO public.form_fields (field_name, field_label, field_type, is_required, display_order) VALUES
  ('aadhaar_card', 'Aadhaar Card', 'file', true, 1),
  ('police_verification', 'Police Verification', 'file', true, 2),
  ('offer_letter', 'Offer Letter', 'file', true, 3),
  ('resume', 'Resume', 'file', false, 4);

-- Insert demo training sessions
INSERT INTO public.training_sessions (title, description, resource_type, resource_url, duration_minutes, is_mandatory) VALUES
  ('Introduction to Company Policies', 'Learn about our company values, culture, and policies', 'youtube', 'https://youtube.com/watch?v=demo1', 45, true),
  ('AI Basics for IT Department', 'Fundamentals of AI and machine learning', 'youtube', 'https://youtube.com/watch?v=demo2', 60, false),
  ('Security Awareness Training', 'Best practices for data security and privacy', 'pdf', 'https://example.com/security.pdf', 30, true);