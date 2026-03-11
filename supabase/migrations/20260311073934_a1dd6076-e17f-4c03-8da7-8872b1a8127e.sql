
CREATE TABLE public.sub_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  games text,
  cookie_file text,
  cookie_file_name text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sub_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sub_accounts" ON public.sub_accounts FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage sub_accounts" ON public.sub_accounts FOR ALL TO public USING (has_role(auth.uid(), 'admin'::text)) WITH CHECK (has_role(auth.uid(), 'admin'::text));
