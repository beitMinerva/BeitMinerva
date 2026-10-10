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
