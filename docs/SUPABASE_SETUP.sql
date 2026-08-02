-- ════════════════════════════════════════════════════════
-- SystematicaHub — Supabase Database Setup
-- Run this entire file in: Supabase → SQL Editor → New query
-- This version FIXES the infinite recursion bug in RLS policies
-- ════════════════════════════════════════════════════════

-- ── 1. PROFILES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text, full_name text, avatar_url text, institution text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 2. REVIEWS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  pico text, protocol_id text,
  status text DEFAULT 'draft' CHECK (status IN ('draft','active','complete')),
  lead_id uuid REFERENCES auth.users ON DELETE SET NULL,
  studies_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lead can manage own reviews"    ON public.reviews;
DROP POLICY IF EXISTS "Team members can view reviews"  ON public.reviews;
DROP POLICY IF EXISTS "reviews_lead_all"               ON public.reviews;
-- Simple non-recursive policy: only lead manages their reviews
CREATE POLICY "reviews_lead_all" ON public.reviews
  FOR ALL USING (auth.uid() = lead_id)
  WITH CHECK (auth.uid() = lead_id);

-- ── 3. TEAM MEMBERS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid REFERENCES public.reviews ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  email text, name text, role text DEFAULT 'Reviewer'
    CHECK (role IN ('Lead reviewer','Reviewer','Viewer')),
  initials text,
  invited_at timestamptz DEFAULT now(),
  UNIQUE(review_id, email)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Review lead can manage team"  ON public.team_members;
DROP POLICY IF EXISTS "Members can view team"        ON public.team_members;
DROP POLICY IF EXISTS "team_lead_all"                ON public.team_members;
DROP POLICY IF EXISTS "team_member_view_self"        ON public.team_members;
-- Non-recursive: look up reviews directly, no cross-reference back
CREATE POLICY "team_lead_all" ON public.team_members FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = team_members.review_id AND reviews.lead_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = team_members.review_id AND reviews.lead_id = auth.uid()));
CREATE POLICY "team_member_view_self" ON public.team_members FOR SELECT
  USING (user_id = auth.uid());

-- ── 4. STUDIES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.studies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid REFERENCES public.reviews ON DELETE CASCADE,
  title text NOT NULL,
  authors text, year int, journal text, doi text, pmid text,
  design text, n int, outcome text, effect_size text, ci text,
  rob_score text DEFAULT 'Moderate' CHECK (rob_score IN ('Low','Moderate','High')),
  abstract text, included boolean DEFAULT true,
  screen_decision text, screen_reason text, screen_confidence text,
  created_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Review members can manage studies" ON public.studies;
DROP POLICY IF EXISTS "studies_lead_all"                  ON public.studies;
CREATE POLICY "studies_lead_all" ON public.studies FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = studies.review_id AND reviews.lead_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = studies.review_id AND reviews.lead_id = auth.uid()));

-- ── 5. PRISMA DATA ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prisma_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid REFERENCES public.reviews ON DELETE CASCADE UNIQUE,
  identified int DEFAULT 0, screened int DEFAULT 0,
  eligible int DEFAULT 0,   included int DEFAULT 0,
  excl_title int DEFAULT 0, excl_fulltext int DEFAULT 0,
  excl_reasons text, updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.prisma_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Review members can manage PRISMA data" ON public.prisma_data;
DROP POLICY IF EXISTS "prisma_lead_all"                       ON public.prisma_data;
CREATE POLICY "prisma_lead_all" ON public.prisma_data FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = prisma_data.review_id AND reviews.lead_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = prisma_data.review_id AND reviews.lead_id = auth.uid()));

-- ── 6. EXTRACTIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.extractions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  study_id uuid REFERENCES public.studies ON DELETE CASCADE,
  review_id uuid REFERENCES public.reviews ON DELETE CASCADE,
  intervention text, comparator text, outcome_measure text,
  effect text, ci_lower numeric, ci_upper numeric, notes text,
  extracted_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.extractions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Review members can manage extractions" ON public.extractions;
DROP POLICY IF EXISTS "extractions_lead_all"                  ON public.extractions;
CREATE POLICY "extractions_lead_all" ON public.extractions FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = extractions.review_id AND reviews.lead_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = extractions.review_id AND reviews.lead_id = auth.uid()));

-- ── 7. QUALITY APPRAISALS ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quality_appraisals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  study_id uuid REFERENCES public.studies ON DELETE CASCADE,
  review_id uuid REFERENCES public.reviews ON DELETE CASCADE,
  tool text, scores jsonb DEFAULT '{}',
  overall_judgement text,
  appraised_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.quality_appraisals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Review members can manage appraisals" ON public.quality_appraisals;
DROP POLICY IF EXISTS "appraisals_lead_all"                  ON public.quality_appraisals;
CREATE POLICY "appraisals_lead_all" ON public.quality_appraisals FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = quality_appraisals.review_id AND reviews.lead_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = quality_appraisals.review_id AND reviews.lead_id = auth.uid()));

-- ── 8. SEARCH STRATEGIES ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.search_strategies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid REFERENCES public.reviews ON DELETE CASCADE,
  research_question text,
  pico_parsed jsonb DEFAULT '{}',
  strategies jsonb DEFAULT '{}',   -- keyed by database name
  created_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.search_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_strategies_lead_all" ON public.search_strategies FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = search_strategies.review_id AND reviews.lead_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reviews WHERE reviews.id = search_strategies.review_id AND reviews.lead_id = auth.uid()));

-- ════════════════════════════════════════════════════════
-- ✅ Done! All tables created with safe, non-recursive RLS.
-- Next: open index.html and fill in your SUPABASE_URL
-- and SUPABASE_ANON_KEY (from Supabase → Settings → API).
-- ════════════════════════════════════════════════════════
