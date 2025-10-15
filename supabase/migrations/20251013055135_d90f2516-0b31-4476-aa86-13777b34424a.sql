-- Create enum for document types
CREATE TYPE public.document_type AS ENUM (
  'aadhaar_card',
  'police_verification',
  'offer_letter',
  'resume',
  'other'
);

-- Create onboarding_documents table for signup documents
CREATE TABLE public.onboarding_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type public.document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, document_type)
);

-- Enable RLS
ALTER TABLE public.onboarding_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own onboarding documents"
  ON public.onboarding_documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding documents"
  ON public.onboarding_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all onboarding documents"
  ON public.onboarding_documents
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all onboarding documents"
  ON public.onboarding_documents
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add onboarding_status to profiles table
ALTER TABLE public.profiles
ADD COLUMN onboarding_status TEXT DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'documents_uploaded', 'verified', 'rejected'));

-- Create index for faster queries
CREATE INDEX idx_onboarding_documents_user_id ON public.onboarding_documents(user_id);
CREATE INDEX idx_profiles_onboarding_status ON public.profiles(onboarding_status);