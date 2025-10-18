/*
  # Initial Database Schema for Nepal Telecom MIS

  1. New Tables
    - `provinces` - Stores Nepal's 7 provinces
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `province_number` (integer, unique)
      - `created_at` (timestamptz)
    
    - `profiles` - User profile information
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `email` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `user_roles` - User role assignments with province mapping
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `role` (app_role enum)
      - `province_id` (uuid, references provinces) - assigns admin to specific province
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, role, province_id)
    
    - `monthly_reports` - Monthly telecom data reports by province
      - `id` (uuid, primary key)
      - `province_id` (uuid, references provinces)
      - `month` (integer, 1-12)
      - `year` (integer, 2000-2100)
      - Subscriber counts for GSM, CDMA, PSTN, ADSL, FTTH
      - Revenue amounts for each service type
      - `total_subscribers` (generated column)
      - `total_revenue` (generated column)
      - `entered_by` (uuid, references auth.users)
      - `created_at`, `updated_at` (timestamptz)
      - Unique constraint on (province_id, month, year)

  2. Security
    - Enable RLS on all tables
    - Provinces are publicly readable
    - Users can manage their own profiles
    - Admins can manage roles and reports
    - Province admins can only modify their assigned province data
    - All authenticated users can view reports

  3. Functions
    - `has_role` - Check if user has specific role
    - `handle_new_user` - Auto-create profile on signup
    - `handle_updated_at` - Update timestamps
*/

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE IF NOT EXISTS public.provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  province_number INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.provinces (name, province_number) VALUES
  ('Koshi Province', 1),
  ('Madhesh Province', 2),
  ('Bagmati Province', 3),
  ('Gandaki Province', 4),
  ('Lumbini Province', 5),
  ('Karnali Province', 6),
  ('Sudurpashchim Province', 7)
ON CONFLICT (province_number) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  province_id UUID REFERENCES public.provinces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role, province_id)
);

CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID REFERENCES public.provinces(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  gsm_subscribers INTEGER DEFAULT 0,
  cdma_subscribers INTEGER DEFAULT 0,
  pstn_subscribers INTEGER DEFAULT 0,
  adsl_subscribers INTEGER DEFAULT 0,
  ftth_subscribers INTEGER DEFAULT 0,
  gsm_revenue DECIMAL(15,2) DEFAULT 0,
  cdma_revenue DECIMAL(15,2) DEFAULT 0,
  pstn_revenue DECIMAL(15,2) DEFAULT 0,
  adsl_revenue DECIMAL(15,2) DEFAULT 0,
  ftth_revenue DECIMAL(15,2) DEFAULT 0,
  total_subscribers INTEGER GENERATED ALWAYS AS (gsm_subscribers + cdma_subscribers + pstn_subscribers + adsl_subscribers + ftth_subscribers) STORED,
  total_revenue DECIMAL(15,2) GENERATED ALWAYS AS (gsm_revenue + cdma_revenue + pstn_revenue + adsl_revenue + ftth_revenue) STORED,
  entered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(province_id, month, year)
);

ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_province(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT province_id
  FROM public.user_roles
  WHERE user_id = _user_id
  AND role = 'admin'
  LIMIT 1
$$;

CREATE POLICY "Anyone can view provinces"
  ON public.provinces FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can view reports"
  ON public.monthly_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert reports for their province"
  ON public.monthly_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND
    province_id = public.get_user_province(auth.uid())
  );

CREATE POLICY "Admins can update reports for their province"
  ON public.monthly_reports FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') AND
    province_id = public.get_user_province(auth.uid())
  );

CREATE POLICY "Admins can delete reports for their province"
  ON public.monthly_reports FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') AND
    province_id = public.get_user_province(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_reports
  BEFORE UPDATE ON public.monthly_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
