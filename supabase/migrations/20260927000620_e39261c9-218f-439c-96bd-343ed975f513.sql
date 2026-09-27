CREATE TABLE public.metric_events (
  event_id uuid PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  kind text NOT NULL,
  client_timestamp timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.metric_events TO service_role;
ALTER TABLE public.metric_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read metric events" ON public.metric_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.metric_events TO authenticated;

CREATE OR REPLACE FUNCTION public.track_listing_event_once(_event_id uuid, _listing_id uuid, _kind text, _client_ts timestamptz DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inserted int;
BEGIN
  IF _kind NOT IN ('view','wa','call') THEN RAISE EXCEPTION 'invalid kind'; END IF;
  IF NOT EXISTS (SELECT 1 FROM listings WHERE id = _listing_id AND is_published) THEN RETURN 0; END IF;
  INSERT INTO metric_events (event_id, listing_id, kind, client_timestamp)
  VALUES (_event_id, _listing_id, _kind, _client_ts) ON CONFLICT (event_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 0 THEN
    RETURN (SELECT views FROM listing_stats WHERE listing_id = _listing_id);
  END IF;
  RETURN public.track_listing_event(_listing_id, _kind);
END; $$;
GRANT EXECUTE ON FUNCTION public.track_listing_event_once(uuid, uuid, text, timestamptz) TO anon, authenticated;