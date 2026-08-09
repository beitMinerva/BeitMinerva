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

-- =========================================================================
-- 24/7 AUTOMATIC BACKGROUND SCHEDULER (pg_cron + pg_net)
-- Run this in Supabase SQL Editor to invoke Edge Function every 5 minutes
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedules existing job if any to avoid duplicates
SELECT cron.unschedule(jobid) 
FROM cron.job 
WHERE jobname = 'check-farm-push-notifications-every-5-min';

-- Schedule Edge Function to run automatically 24/7 every 5 minutes
SELECT cron.schedule(
    'check-farm-push-notifications-every-5-min',
    '*/5 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://tlneqawnaifeipudbwjq.supabase.co/functions/v1/send-push-notifications',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_HtzmJ9d-NTPVUfUByceSbw_PtajHP1A"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);
