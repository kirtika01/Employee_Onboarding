-- Create the employee_docs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee_docs', 'employee_docs', false);

-- Allow authenticated users to upload their own documents to employee_docs
CREATE POLICY "Users can upload to employee_docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee_docs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own documents in employee_docs
CREATE POLICY "Users can view their employee_docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee_docs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all documents in employee_docs
CREATE POLICY "Admins can view all employee_docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee_docs' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to upload documents for any user to employee_docs
CREATE POLICY "Admins can upload to employee_docs for users"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee_docs' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete any document from employee_docs
CREATE POLICY "Admins can delete from employee_docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee_docs' AND
  has_role(auth.uid(), 'admin'::app_role)
);