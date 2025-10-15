-- Allow unauthenticated users to view departments for signup
DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;

CREATE POLICY "Anyone can view departments"
ON public.departments
FOR SELECT
USING (true);