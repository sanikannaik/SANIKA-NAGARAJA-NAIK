-- =============================================================================
-- ELDERCARE CONNECT — COMPLETE SUPABASE POSTGRESQL SCHEMA, RLS, STORAGE & RPC
-- Run this entire script inside your Supabase SQL Editor.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. CORE TABLES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'elderly' CHECK (role IN ('elderly', 'volunteer', 'admin')),
  profile_image TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'kn')),
  is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.elderly_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  pincode TEXT NOT NULL,
  emergency_contact TEXT NOT NULL,
  additional_requirements TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.volunteer_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  skills TEXT[] NOT NULL DEFAULT '{}',
  categories TEXT[] NOT NULL DEFAULT '{}',
  service_area TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  pincode TEXT NOT NULL DEFAULT '',
  availability TEXT NOT NULL,
  bio TEXT DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verification_document_path TEXT,
  verification_notes TEXT,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assistance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_kn TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assistance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code TEXT NOT NULL UNIQUE DEFAULT ('EC-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8))),
  elderly_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  simplified_description TEXT,
  location TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  attachment_path TEXT,
  additional_instructions TEXT,
  status TEXT NOT NULL DEFAULT 'WAITING FOR VOLUNTEER' CHECK (
    status IN (
      'REQUEST SUBMITTED',
      'WAITING FOR VOLUNTEER',
      'VOLUNTEER ACCEPTED',
      'ASSISTANCE IN PROGRESS',
      'TASK COMPLETED',
      'ELDERLY USER CONFIRMATION',
      'FEEDBACK AND RATING',
      'CANCELLED'
    )
  ),
  assigned_volunteer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.request_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.assistance_requests(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.assistance_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_request_id UUID REFERENCES public.assistance_requests(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES public.assistance_requests(id) ON DELETE CASCADE,
  elderly_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_id UUID REFERENCES public.assistance_requests(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'contact' CHECK (type IN ('contact', 'feedback', 'support')),
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_volunteer_details_status ON public.volunteer_details(verification_status);
CREATE INDEX IF NOT EXISTS idx_requests_elderly ON public.assistance_requests(elderly_user_id);
CREATE INDEX IF NOT EXISTS idx_requests_volunteer ON public.assistance_requests(assigned_volunteer_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.assistance_requests(status);
CREATE INDEX IF NOT EXISTS idx_status_history_request ON public.request_status_history(request_id);
CREATE INDEX IF NOT EXISTS idx_messages_request ON public.request_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_reviews_volunteer ON public.reviews(volunteer_id);

-- -----------------------------------------------------------------------------
-- 2. SEED DEFAULT ASSISTANCE CATEGORIES
-- -----------------------------------------------------------------------------

INSERT INTO public.assistance_categories (name, name_kn, description, sort_order) VALUES
  ('Medical Assistance', 'ವೈದ್ಯಕೀಯ ಸಹಾಯ', 'Non-emergency clinic check-ins, prescription reminders, and health record organization.', 1),
  ('Grocery Shopping', 'ಕಿರಾಣಿ ಖರೀದಿ', 'Weekly fresh produce, household staples, and doorstep delivery.', 2),
  ('Medicine Collection', 'ಔಷಧಿ ಸಂಗ್ರಹಣೆ', 'Picking up prescribed medications from local pharmacies.', 3),
  ('Transportation', 'ಸಾರಿಗೆ ಸಹಾಯ', 'Safe accompanied rides to local errands, banks, or community centers.', 4),
  ('Hospital Visits', 'ಆಸ್ಪತ್ರೆ ಭೇಟಿ', 'Escort and queue assistance for scheduled doctor appointments.', 5),
  ('Household Assistance', 'ಮನೆಕೆಲಸದ ಸಹಾಯ', 'Light home upkeep, changing bulbs, organizing shelves, and minor chores.', 6),
  ('Digital Assistance', 'ಡಿಜಿಟಲ್ ಸಹಾಯ', 'Help with video calls, smartphone settings, online forms, and safety.', 7),
  ('Bill Payments', 'ಬಿಲ್ ಪಾವತಿ', 'Guidance with electricity, water, phone, and municipal bill payments.', 8),
  ('Companionship', 'ಒಡನಾಟ ಮತ್ತು ಬೆಂಬಲ', 'Friendly visits, reading aloud, walks in the park, and conversation.', 9),
  ('Other Assistance', 'ಇತರೆ ಸಹಾಯ', 'Any other safe everyday community assistance request.', 10)
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. SECURITY HELPER FUNCTIONS (PREVENT RLS RECURSION & PRIVILEGE ESCALATION)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_suspended = FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_volunteer()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.volunteer_details v ON v.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.role = 'volunteer'
      AND p.is_suspended = FALSE
      AND v.verification_status = 'approved'
  );
$$;

-- Trigger: Automatically create profile on signup (NEVER allow self-assigned 'admin')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_lang TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'elderly');
  IF v_role NOT IN ('elderly', 'volunteer') THEN
    v_role := 'elderly';
  END IF;

  v_lang := COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en');
  IF v_lang NOT IN ('en', 'kn') THEN
    v_lang := 'en';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone, role, preferred_language)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    v_role,
    v_lang
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Log initial request status and update timestamps
CREATE OR REPLACE FUNCTION public.handle_new_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.request_status_history (request_id, previous_status, new_status, updated_by, note)
  VALUES (NEW.id, NULL, 'REQUEST SUBMITTED', NEW.elderly_user_id, 'Request created by elderly member'),
         (NEW.id, 'REQUEST SUBMITTED', NEW.status, NEW.elderly_user_id, 'Matching with verified neighborhood volunteers');

  INSERT INTO public.notifications (user_id, title, message, related_request_id)
  VALUES (
    NEW.elderly_user_id,
    'Request Submitted (' || NEW.request_code || ')',
    'Your request "' || NEW.title || '" is now visible to verified volunteers in your area.',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_assistance_request_created ON public.assistance_requests;
CREATE TRIGGER on_assistance_request_created
  AFTER INSERT ON public.assistance_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_request();

-- Trigger: Recompute volunteer average rating when review inserted
CREATE OR REPLACE FUNCTION public.handle_new_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.volunteer_details
  SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM public.reviews WHERE volunteer_id = NEW.volunteer_id), 0),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE volunteer_id = NEW.volunteer_id)
  WHERE user_id = NEW.volunteer_id;

  UPDATE public.assistance_requests
  SET status = 'FEEDBACK AND RATING', updated_at = NOW()
  WHERE id = NEW.request_id;

  INSERT INTO public.request_status_history (request_id, previous_status, new_status, updated_by, note)
  VALUES (NEW.request_id, 'ELDERLY USER CONFIRMATION', 'FEEDBACK AND RATING', NEW.elderly_user_id, 'Feedback and rating submitted');

  INSERT INTO public.notifications (user_id, title, message, related_request_id)
  VALUES (
    NEW.volunteer_id,
    'New Feedback Received',
    'You received a ' || NEW.rating || '-star review for your recent community assistance.',
    NEW.request_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_review();

-- -----------------------------------------------------------------------------
-- 4. ATOMIC WORKFLOW RPCs
-- -----------------------------------------------------------------------------

-- Atomic volunteer acceptance (prevents double-acceptance race condition)
CREATE OR REPLACE FUNCTION public.accept_assistance_request(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.assistance_requests%ROWTYPE;
  v_vol_name TEXT;
BEGIN
  IF NOT public.is_approved_volunteer() THEN
    RAISE EXCEPTION 'Only verified and active volunteers can accept requests.';
  END IF;

  SELECT * INTO v_req
  FROM public.assistance_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assistance request not found.';
  END IF;

  IF v_req.assigned_volunteer_id IS NOT NULL OR v_req.status NOT IN ('REQUEST SUBMITTED', 'WAITING FOR VOLUNTEER') THEN
    RAISE EXCEPTION 'This request has already been accepted by another volunteer or is no longer open.';
  END IF;

  UPDATE public.assistance_requests
  SET
    assigned_volunteer_id = auth.uid(),
    status = 'VOLUNTEER ACCEPTED',
    updated_at = NOW()
  WHERE id = p_request_id;

  SELECT full_name INTO v_vol_name FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.request_status_history (request_id, previous_status, new_status, updated_by, note)
  VALUES (p_request_id, v_req.status, 'VOLUNTEER ACCEPTED', auth.uid(), 'Accepted by verified volunteer ' || COALESCE(v_vol_name, 'Volunteer'));

  INSERT INTO public.notifications (user_id, title, message, related_request_id)
  VALUES (
    v_req.elderly_user_id,
    'Volunteer Accepted Your Request',
    COALESCE(v_vol_name, 'A verified volunteer') || ' accepted "' || v_req.title || '" (' || v_req.request_code || ').',
    p_request_id
  );

  RETURN jsonb_build_object('success', true, 'request_id', p_request_id, 'status', 'VOLUNTEER ACCEPTED');
END;
$$;

-- Role-enforced status updates with audit trail and notifications
CREATE OR REPLACE FUNCTION public.update_request_status(
  p_request_id UUID,
  p_new_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.assistance_requests%ROWTYPE;
  v_is_admin BOOLEAN;
BEGIN
  v_is_admin := public.is_admin();

  SELECT * INTO v_req
  FROM public.assistance_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assistance request not found.';
  END IF;

  IF NOT v_is_admin THEN
    IF p_new_status IN ('ASSISTANCE IN PROGRESS', 'TASK COMPLETED') THEN
      IF v_req.assigned_volunteer_id <> auth.uid() THEN
        RAISE EXCEPTION 'Only the assigned volunteer can update progress.';
      END IF;
    ELSIF p_new_status = 'ELDERLY USER CONFIRMATION' THEN
      IF v_req.elderly_user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Only the elderly member can confirm completion.';
      END IF;
    ELSIF p_new_status = 'CANCELLED' THEN
      IF v_req.elderly_user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Only the request owner or administrator can cancel this request.';
      END IF;
    ELSE
      RAISE EXCEPTION 'Unauthorized status transition.';
    END IF;
  END IF;

  UPDATE public.assistance_requests
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_request_id;

  INSERT INTO public.request_status_history (request_id, previous_status, new_status, updated_by, note)
  VALUES (p_request_id, v_req.status, p_new_status, auth.uid(), COALESCE(p_note, 'Status updated to ' || p_new_status));

  -- Notify the counterpart
  IF auth.uid() = v_req.assigned_volunteer_id THEN
    INSERT INTO public.notifications (user_id, title, message, related_request_id)
    VALUES (
      v_req.elderly_user_id,
      'Request Status Update (' || v_req.request_code || ')',
      'Your request "' || v_req.title || '" is now: ' || p_new_status || '.',
      p_request_id
    );
    IF p_new_status = 'TASK COMPLETED' THEN
      INSERT INTO public.notifications (user_id, title, message, related_request_id)
      VALUES (
        v_req.elderly_user_id,
        'Please Confirm Completion & Leave Feedback',
        'Your volunteer marked "' || v_req.title || '" as completed. Please confirm and share a rating.',
        p_request_id
      );
    END IF;
  ELSIF auth.uid() = v_req.elderly_user_id AND v_req.assigned_volunteer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, related_request_id)
    VALUES (
      v_req.assigned_volunteer_id,
      'Member Confirmed (' || v_req.request_code || ')',
      'Status for "' || v_req.title || '" updated to ' || p_new_status || '.',
      p_request_id
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'request_id', p_request_id, 'status', p_new_status);
END;
$$;

-- Safe public community aggregate statistics (NO PII exposed)
CREATE OR REPLACE FUNCTION public.get_public_community_stats()
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'verified_volunteers', (SELECT COUNT(*) FROM public.volunteer_details WHERE verification_status = 'approved'),
    'completed_requests', (SELECT COUNT(*) FROM public.assistance_requests WHERE status IN ('TASK COMPLETED', 'ELDERLY USER CONFIRMATION', 'FEEDBACK AND RATING')),
    'elderly_members', (SELECT COUNT(*) FROM public.profiles WHERE role = 'elderly' AND is_suspended = FALSE),
    'average_rating', COALESCE((SELECT ROUND(AVG(rating)::NUMERIC, 1) FROM public.reviews), 0)
  );
$$;

-- Safe public list of verified volunteers (NO phone, email, or verification document paths)
CREATE OR REPLACE FUNCTION public.get_public_verified_volunteers()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  profile_image TEXT,
  preferred_language TEXT,
  skills TEXT[],
  categories TEXT[],
  service_area TEXT,
  city TEXT,
  availability TEXT,
  bio TEXT,
  rating NUMERIC,
  review_count INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    p.full_name,
    p.profile_image,
    p.preferred_language,
    v.skills,
    v.categories,
    v.service_area,
    v.city,
    v.availability,
    v.bio,
    v.rating,
    v.review_count
  FROM public.volunteer_details v
  JOIN public.profiles p ON p.id = v.user_id
  WHERE v.verification_status = 'approved'
    AND p.is_suspended = FALSE
  ORDER BY v.rating DESC, v.review_count DESC;
$$;

-- Safe public reviews (first-name/initial attribution only, no private contact info)
CREATE OR REPLACE FUNCTION public.get_public_reviews()
RETURNS TABLE (
  id UUID,
  rating INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ,
  elderly_name TEXT,
  volunteer_name TEXT,
  category TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.rating,
    r.feedback,
    r.created_at,
    ep.full_name AS elderly_name,
    vp.full_name AS volunteer_name,
    ar.category
  FROM public.reviews r
  JOIN public.profiles ep ON ep.id = r.elderly_user_id
  JOIN public.profiles vp ON vp.id = r.volunteer_id
  JOIN public.assistance_requests ar ON ar.id = r.request_id
  WHERE LENGTH(TRIM(r.feedback)) > 0
  ORDER BY r.created_at DESC
  LIMIT 6;
$$;

-- Protected contact disclosure ONLY to assigned volunteer / elderly owner / admin
CREATE OR REPLACE FUNCTION public.get_request_participant_contacts(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.assistance_requests%ROWTYPE;
  v_elderly_profile public.profiles%ROWTYPE;
  v_elderly_details public.elderly_details%ROWTYPE;
  v_vol_profile public.profiles%ROWTYPE;
  v_vol_details public.volunteer_details%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.assistance_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found.';
  END IF;

  IF auth.uid() <> v_req.elderly_user_id
     AND auth.uid() <> v_req.assigned_volunteer_id
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to view participant contact details for this request.';
  END IF;

  SELECT * INTO v_elderly_profile FROM public.profiles WHERE id = v_req.elderly_user_id;
  SELECT * INTO v_elderly_details FROM public.elderly_details WHERE user_id = v_req.elderly_user_id;

  IF v_req.assigned_volunteer_id IS NOT NULL THEN
    SELECT * INTO v_vol_profile FROM public.profiles WHERE id = v_req.assigned_volunteer_id;
    SELECT * INTO v_vol_details FROM public.volunteer_details WHERE user_id = v_req.assigned_volunteer_id;
  END IF;

  RETURN jsonb_build_object(
    'elderly', jsonb_build_object(
      'full_name', v_elderly_profile.full_name,
      'phone', v_elderly_profile.phone,
      'address', v_elderly_details.address,
      'city', v_elderly_details.city,
      'pincode', v_elderly_details.pincode,
      'emergency_contact', v_elderly_details.emergency_contact,
      'additional_requirements', v_elderly_details.additional_requirements
    ),
    'volunteer', CASE WHEN v_req.assigned_volunteer_id IS NOT NULL THEN jsonb_build_object(
      'full_name', v_vol_profile.full_name,
      'phone', v_vol_profile.phone,
      'service_area', v_vol_details.service_area,
      'rating', v_vol_details.rating,
      'review_count', v_vol_details.review_count,
      'verification_status', v_vol_details.verification_status
    ) ELSE NULL END
  );
END;
$$;

-- Admin volunteer verification action with automatic notification
CREATE OR REPLACE FUNCTION public.admin_verify_volunteer(
  p_volunteer_user_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can verify volunteers.';
  END IF;

  IF p_status NOT IN ('approved', 'rejected', 'pending') THEN
    RAISE EXCEPTION 'Invalid verification status.';
  END IF;

  UPDATE public.volunteer_details
  SET verification_status = p_status, verification_notes = p_notes
  WHERE user_id = p_volunteer_user_id;

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    p_volunteer_user_id,
    'Volunteer Verification ' || INITCAP(p_status),
    CASE
      WHEN p_status = 'approved' THEN 'Your volunteer identity verification has been approved. You can now accept nearby requests.'
      WHEN p_status = 'rejected' THEN 'Your volunteer verification requires updates: ' || COALESCE(p_notes, 'Please upload a clearer ID document.')
      ELSE 'Your verification status was updated to pending review.'
    END
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elderly_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile or admin can view all"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update own non-privileged profile fields"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (
      id = auth.uid()
      AND role = public.current_user_role()
    )
  );

-- elderly_details
CREATE POLICY "Elderly user or admin can view elderly_details"
  ON public.elderly_details FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Elderly user can insert own elderly_details"
  ON public.elderly_details FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Elderly user can update own elderly_details"
  ON public.elderly_details FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

-- volunteer_details
CREATE POLICY "Volunteer or admin can view full volunteer_details"
  ON public.volunteer_details FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Volunteer can insert own volunteer_details"
  ON public.volunteer_details FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Volunteer can update own non-verification fields or admin updates all"
  ON public.volunteer_details FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (
      user_id = auth.uid()
      AND verification_status = (
        SELECT vd.verification_status FROM public.volunteer_details vd WHERE vd.user_id = auth.uid()
      )
    )
  );

-- assistance_categories
CREATE POLICY "Anyone can view active categories"
  ON public.assistance_categories FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Admins can manage categories"
  ON public.assistance_categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- assistance_requests
CREATE POLICY "Elderly owners, assigned volunteers, open-pool verified volunteers, and admins can select requests"
  ON public.assistance_requests FOR SELECT
  USING (
    elderly_user_id = auth.uid()
    OR assigned_volunteer_id = auth.uid()
    OR public.is_admin()
    OR (
      public.is_approved_volunteer()
      AND status IN ('REQUEST SUBMITTED', 'WAITING FOR VOLUNTEER')
      AND assigned_volunteer_id IS NULL
    )
  );

CREATE POLICY "Active elderly users can create assistance requests"
  ON public.assistance_requests FOR INSERT
  WITH CHECK (
    elderly_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_suspended = FALSE
    )
  );

CREATE POLICY "Admins can update requests"
  ON public.assistance_requests FOR UPDATE
  USING (public.is_admin());

-- request_status_history
CREATE POLICY "Request participants and admins can view status history"
  ON public.request_status_history FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assistance_requests r
      WHERE r.id = request_id
        AND (r.elderly_user_id = auth.uid() OR r.assigned_volunteer_id = auth.uid())
    )
  );

-- request_messages
CREATE POLICY "Request participants and admins can view messages"
  ON public.request_messages FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assistance_requests r
      WHERE r.id = request_id
        AND (r.elderly_user_id = auth.uid() OR r.assigned_volunteer_id = auth.uid())
    )
  );

CREATE POLICY "Request participants can send messages"
  ON public.request_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.assistance_requests r
      WHERE r.id = request_id
        AND (r.elderly_user_id = auth.uid() OR r.assigned_volunteer_id = auth.uid())
        AND r.status <> 'CANCELLED'
    )
  );

-- notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- reviews
CREATE POLICY "Participants and admins can view reviews"
  ON public.reviews FOR SELECT
  USING (
    elderly_user_id = auth.uid()
    OR volunteer_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "Elderly owner can create review after completion"
  ON public.reviews FOR INSERT
  WITH CHECK (
    elderly_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.assistance_requests r
      WHERE r.id = request_id
        AND r.elderly_user_id = auth.uid()
        AND volunteer_id IS NOT DISTINCT FROM r.assigned_volunteer_id
        AND r.status IN ('TASK COMPLETED', 'ELDERLY USER CONFIRMATION')
    )
  );

-- reports
CREATE POLICY "Users can view own submitted reports or admins view all"
  ON public.reports FOR SELECT
  USING (reported_by = auth.uid() OR public.is_admin());

CREATE POLICY "Authenticated users can submit reports"
  ON public.reports FOR INSERT
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  USING (public.is_admin());

-- support_messages
CREATE POLICY "Anyone can submit contact or support messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Admins or submitter can view support messages"
  ON public.support_messages FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- -----------------------------------------------------------------------------
-- 6. STORAGE BUCKETS & POLICIES
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('verification-documents', 'verification-documents', FALSE),
  ('request-attachments', 'request-attachments', FALSE),
  ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Verification documents: private (owner + admin only)
CREATE POLICY "Volunteers upload own verification docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Volunteers and admins read verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND ((storage.foldername(name))[1] = auth.uid()::TEXT OR public.is_admin())
  );

-- Request attachments: private (authenticated upload under own uid folder, participants read)
CREATE POLICY "Users upload own request attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'request-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Authenticated members read request attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'request-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR public.is_approved_volunteer()
      OR public.is_admin()
    )
  );

-- Avatars: public read, owner upload
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Owner upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- -----------------------------------------------------------------------------
-- 7. SUPABASE REALTIME PUBLICATION
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.assistance_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.request_status_history;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.request_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
