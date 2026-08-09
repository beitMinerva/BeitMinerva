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
