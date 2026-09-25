CREATE TABLE public.listing_daily_stats (
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  day date NOT NULL,
  views integer NOT NULL DEFAULT 0,
  wa_clicks integer NOT NULL DEFAULT 0,
  call_clicks integer NOT NULL DEFAULT 0,
  PRIMARY KEY (listing_id, day)
);
GRANT SELECT ON public.listing_daily_stats TO authenticated;
GRANT ALL ON public.listing_daily_stats TO service_role;
ALTER TABLE public.listing_daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read daily stats" ON public.listing_daily_stats FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.track_listing_event(_listing_id uuid, _kind text)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result integer; d date := (now() AT TIME ZONE 'Europe/Istanbul')::date;
BEGIN
  IF _kind NOT IN ('view','wa','call') THEN RAISE EXCEPTION 'invalid kind'; END IF;
  IF NOT EXISTS (SELECT 1 FROM listings WHERE id = _listing_id AND is_published) THEN RETURN 0; END IF;
  INSERT INTO listing_daily_stats (listing_id, day, views, wa_clicks, call_clicks)
  VALUES (_listing_id, d, (_kind='view')::int, (_kind='wa')::int, (_kind='call')::int)
  ON CONFLICT (listing_id, day) DO UPDATE SET
    views = listing_daily_stats.views + (_kind='view')::int,
    wa_clicks = listing_daily_stats.wa_clicks + (_kind='wa')::int,
    call_clicks = listing_daily_stats.call_clicks + (_kind='call')::int;
  INSERT INTO listing_stats (listing_id, views, wa_clicks, call_clicks)
  VALUES (_listing_id, (_kind='view')::int, (_kind='wa')::int, (_kind='call')::int)
  ON CONFLICT (listing_id) DO UPDATE SET
    views = listing_stats.views + (_kind='view')::int,
    wa_clicks = listing_stats.wa_clicks + (_kind='wa')::int,
    call_clicks = listing_stats.call_clicks + (_kind='call')::int,
    updated_at = now()
  RETURNING views INTO result;
  RETURN result;
END; $function$;