-- Create training assignments table for personalized training
CREATE TABLE IF NOT EXISTS public.training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, training_session_id)
);

-- Create form assignments table for personalized forms
CREATE TABLE IF NOT EXISTS public.form_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_field_id UUID NOT NULL REFERENCES public.form_fields(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, form_field_id)
);

-- Enable RLS
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_assignments
CREATE POLICY "Users can view their own training assignments"
ON public.training_assignments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all training assignments"
ON public.training_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for form_assignments
CREATE POLICY "Users can view their own form assignments"
ON public.form_assignments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all form assignments"
ON public.form_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update training_sessions RLS to show only assigned sessions for employees
DROP POLICY IF EXISTS "Users can view their department training sessions" ON public.training_sessions;

CREATE POLICY "Users can view assigned training sessions"
ON public.training_sessions FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  id IN (
    SELECT training_session_id 
    FROM public.training_assignments 
    WHERE user_id = auth.uid()
  )
);

-- Update form_fields RLS to show only assigned forms for employees
DROP POLICY IF EXISTS "Everyone can view active form fields" ON public.form_fields;

CREATE POLICY "Admins can view all form fields"
ON public.form_fields FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view assigned form fields"
ON public.form_fields FOR SELECT
USING (
  id IN (
    SELECT form_field_id 
    FROM public.form_assignments 
    WHERE user_id = auth.uid()
  ) AND is_active = true
);