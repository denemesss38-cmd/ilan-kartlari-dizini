CREATE TABLE public.listing_stats (
  listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  views integer NOT NULL DEFAULT 0,
  wa_clicks integer NOT NULL DEFAULT 0,
  call_clicks integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listing_stats TO anon, authenticated;
GRANT ALL ON public.listing_stats TO service_role;
ALTER TABLE public.listing_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read listing stats" ON public.listing_stats FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.track_listing_event(_listing_id uuid, _kind text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result integer;
BEGIN
  IF _kind NOT IN ('view','wa','call') THEN RAISE EXCEPTION 'invalid kind'; END IF;
  IF NOT EXISTS (SELECT 1 FROM listings WHERE id = _listing_id AND is_published) THEN RETURN 0; END IF;
  INSERT INTO listing_stats (listing_id, views, wa_clicks, call_clicks)
  VALUES (_listing_id, (_kind='view')::int, (_kind='wa')::int, (_kind='call')::int)
  ON CONFLICT (listing_id) DO UPDATE SET
    views = listing_stats.views + (_kind='view')::int,
    wa_clicks = listing_stats.wa_clicks + (_kind='wa')::int,
    call_clicks = listing_stats.call_clicks + (_kind='call')::int,
    updated_at = now()
  RETURNING views INTO result;
  RETURN result;
END; $$;
GRANT EXECUTE ON FUNCTION public.track_listing_event(uuid, text) TO anon, authenticated;