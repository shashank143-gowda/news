
-- Enums
CREATE TYPE public.app_role AS ENUM ('editor', 'chief_editor');
CREATE TYPE public.newspaper_status AS ENUM ('draft','pending_layout','pending_approval','approved','rejected','published');
CREATE TYPE public.article_category AS ENUM ('Politics','Sports','Crime','Agriculture','Education','Cinema','Business','Other');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles readable by owner" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "roles insert by owner" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  -- Assign role from metadata (default editor)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'editor'::public.app_role))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- newspapers
CREATE TABLE public.newspapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_name TEXT NOT NULL,
  edition_date DATE NOT NULL,
  language TEXT NOT NULL DEFAULT 'Kannada',
  number_of_pages INT NOT NULL DEFAULT 8,
  template TEXT NOT NULL DEFAULT 'classic',
  status public.newspaper_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newspapers TO authenticated;
GRANT ALL ON public.newspapers TO service_role;
ALTER TABLE public.newspapers ENABLE ROW LEVEL SECURITY;
-- Editors see their own; chief editors see all pending/approved/etc.
CREATE POLICY "editor sees own newspapers" ON public.newspapers FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'chief_editor'));
CREATE POLICY "editor creates newspapers" ON public.newspapers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.has_role(auth.uid(), 'editor'));
CREATE POLICY "editor updates own newspapers" ON public.newspapers FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'chief_editor'));
CREATE POLICY "editor deletes own drafts" ON public.newspapers FOR DELETE TO authenticated
  USING (auth.uid() = created_by AND status = 'draft');

-- articles
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newspaper_id UUID NOT NULL REFERENCES public.newspapers(id) ON DELETE CASCADE,
  raw_input_type TEXT NOT NULL DEFAULT 'text',
  raw_text TEXT,
  ocr_text TEXT,
  corrected_text TEXT,
  headline TEXT,
  summary TEXT,
  category public.article_category,
  priority_score INT DEFAULT 50,
  image_url TEXT,
  image_source TEXT,
  workflow_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  page_number INT,
  position TEXT,
  headline_size TEXT DEFAULT 'medium',
  image_size TEXT DEFAULT 'medium',
  column_count INT DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX articles_newspaper_idx ON public.articles(newspaper_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles visible via parent" ON public.articles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.newspapers n WHERE n.id = newspaper_id
    AND (n.created_by = auth.uid() OR public.has_role(auth.uid(), 'chief_editor'))));
CREATE POLICY "articles insertable by owner" ON public.articles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.newspapers n WHERE n.id = newspaper_id AND n.created_by = auth.uid()));
CREATE POLICY "articles updatable by owner or chief" ON public.articles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.newspapers n WHERE n.id = newspaper_id
    AND (n.created_by = auth.uid() OR public.has_role(auth.uid(), 'chief_editor'))));
CREATE POLICY "articles deletable by owner" ON public.articles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.newspapers n WHERE n.id = newspaper_id AND n.created_by = auth.uid()));

-- layouts
CREATE TABLE public.layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newspaper_id UUID NOT NULL REFERENCES public.newspapers(id) ON DELETE CASCADE,
  layout_json JSONB NOT NULL,
  version INT NOT NULL DEFAULT 1,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX layouts_newspaper_idx ON public.layouts(newspaper_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.layouts TO authenticated;
GRANT ALL ON public.layouts TO service_role;
ALTER TABLE public.layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "layouts visible via parent" ON public.layouts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.newspapers n WHERE n.id = newspaper_id
    AND (n.created_by = auth.uid() OR public.has_role(auth.uid(), 'chief_editor'))));
CREATE POLICY "layouts writable by owner" ON public.layouts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.newspapers n WHERE n.id = newspaper_id AND n.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.newspapers n WHERE n.id = newspaper_id AND n.created_by = auth.uid()));

-- reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newspaper_id UUID NOT NULL REFERENCES public.newspapers(id) ON DELETE CASCADE,
  chief_editor_id UUID NOT NULL REFERENCES auth.users(id),
  decision TEXT NOT NULL,
  comment TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews visible via parent" ON public.reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.newspapers n WHERE n.id = newspaper_id
    AND (n.created_by = auth.uid() OR public.has_role(auth.uid(), 'chief_editor'))));
CREATE POLICY "reviews insertable by chief" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'chief_editor') AND auth.uid() = chief_editor_id);

-- publications
CREATE TABLE public.publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newspaper_id UUID NOT NULL REFERENCES public.newspapers(id) ON DELETE CASCADE,
  print_pdf_url TEXT,
  epaper_url TEXT,
  audio_url TEXT,
  instagram_card_url TEXT,
  facebook_post_url TEXT,
  whatsapp_share_url TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.publications TO authenticated;
GRANT ALL ON public.publications TO service_role;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "publications visible via parent" ON public.publications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.newspapers n WHERE n.id = newspaper_id
    AND (n.created_by = auth.uid() OR public.has_role(auth.uid(), 'chief_editor'))));
CREATE POLICY "publications writable via parent" ON public.publications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.newspapers n WHERE n.id = newspaper_id AND n.created_by = auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER newspapers_touch BEFORE UPDATE ON public.newspapers FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER articles_touch BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
