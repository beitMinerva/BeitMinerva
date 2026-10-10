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

-- Beirut wall-clock notification schedule, including daylight-saving changes.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule(jobid) FROM cron.job
WHERE jobname IN ('farm-push-morning-730am', 'farm-push-midday-evening', 'farm-push-beirut');

SELECT cron.schedule(
    'farm-push-beirut',
    '* * * * *',
    $$
    SELECT net.http_post(
        url := 'https://tlneqawnaifeipudbwjq.supabase.co/functions/v1/send-push-notifications',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_HtzmJ9d-NTPVUfUByceSbw_PtajHP1A"}'::jsonb,
        body := '{}'::jsonb
    )
    WHERE to_char(now() AT TIME ZONE 'Asia/Beirut', 'HH24:MI') IN ('07:30', '12:00', '17:00');
    $$
);
