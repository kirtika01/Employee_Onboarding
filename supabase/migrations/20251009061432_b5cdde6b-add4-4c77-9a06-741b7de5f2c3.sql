-- Add department-specific fields to profiles
ALTER TABLE public.profiles
ADD COLUMN phone_number TEXT,
ADD COLUMN department_specific_data JSONB DEFAULT '{}'::jsonb;

-- Insert predefined departments
INSERT INTO public.departments (name, description) VALUES
('Educators', 'Teaching and educational staff'),
('Sales', 'Sales and business development team'),
('Marketing', 'Marketing and brand management'),
('IT', 'Information technology department'),
('Onboarding', 'HR and onboarding specialists')
ON CONFLICT DO NOTHING;

-- Create admin user function to be called after manual user creation
CREATE OR REPLACE FUNCTION public.setup_admin_user(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the user id from auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Update user_roles to admin
  DELETE FROM public.user_roles WHERE user_id = admin_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin');
  
  -- Update profile
  UPDATE public.profiles
  SET full_name = 'Admin User'
  WHERE id = admin_user_id;
END;
$$;

-- Update handle_new_user to include department_specific_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    phone_number,
    department_id,
    department_specific_data
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone_number',
    (NEW.raw_user_meta_data->>'department_id')::uuid,
    COALESCE((NEW.raw_user_meta_data->>'department_specific_data')::jsonb, '{}'::jsonb)
  );
  
  -- Assign employee role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;