-- Supabase SQL Table definition for Web Push Subscriptions (iOS & Mobile background notifications)

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security) and allow public access for single-farm app
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to push_subscriptions" 
    ON public.push_subscriptions FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to push_subscriptions" 
    ON public.push_subscriptions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to push_subscriptions" 
    ON public.push_subscriptions FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to push_subscriptions" 
    ON public.push_subscriptions FOR DELETE USING (true);

-- Optional Table Migration for timeline_events:
ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- =========================================================================
-- 24/7 BEIRUT FARM SCHEDULER (pg_cron + pg_net)
-- Runs at 7:30 AM, 12:00 PM, and 5:00 PM Beirut Time (UTC+3)
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedules old test jobs if any
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname LIKE 'farm-push-%' OR jobname LIKE 'check-farm-push-%';

-- 1. Morning Briefing: 7:30 AM Beirut Time (4:30 AM UTC)
SELECT cron.schedule(
    'farm-push-morning-730am',
    '30 4 * * *',
    $$
    SELECT net.http_post(
        url := 'https://tlneqawnaifeipudbwjq.supabase.co/functions/v1/send-push-notifications',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_HtzmJ9d-NTPVUfUByceSbw_PtajHP1A"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);

-- 2. Midday Briefing & Evening Check: 12:00 PM & 5:00 PM Beirut Time (9:00 AM & 2:00 PM UTC)
SELECT cron.schedule(
    'farm-push-midday-evening',
    '0 9,14 * * *',
    $$
    SELECT net.http_post(
        url := 'https://tlneqawnaifeipudbwjq.supabase.co/functions/v1/send-push-notifications',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_HtzmJ9d-NTPVUfUByceSbw_PtajHP1A"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);
