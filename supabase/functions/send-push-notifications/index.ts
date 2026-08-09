import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://tlneqawnaifeipudbwjq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "BP0hZFBqEATCuSp6r9q52vA7sqGhb0Hkc7j1Keix9hBApQsDjcWX3pKdW9fJfK9FXlbNe0TA2WAJDQ38CvHBL_w";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "7mtrSYs6IbpFuwdYFRyTjJbumP0a1tdZNzxUXENbKYw";
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "mailto:admin@beitminerva.farm";

function hasRepeatFrequency(ev: any): boolean {
  if (ev.repeat_frequency && ev.repeat_frequency !== 'none') return true;
  if (Array.isArray(ev.custom_fields)) {
    const rfField = ev.custom_fields.find((f: any) => f && f.name === 'repeat_frequency');
    if (rfField && rfField.value && rfField.value !== 'none') return true;
  }
  if (typeof ev.custom_fields === 'object' && ev.custom_fields?.repeat_frequency && ev.custom_fields.repeat_frequency !== 'none') {
    return true;
  }
  return false;
}

serve(async (req) => {
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const urlParams = new URL(req.url).searchParams;
    const isManualTest = urlParams.get("test") === "true";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: subs, error: subErr } = await supabase.from("push_subscriptions").select("*");
    if (subErr || !subs || subs.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No active push subscriptions found in DB." }), { headers });
    }

    const { data: goats } = await supabase.from("goats").select("id, name, tag_id");
    const { data: events } = await supabase.from("timeline_events").select("*");

    const goatsMap: Record<string, string> = {};
    if (goats) {
      goats.forEach((g: any) => { 
        goatsMap[g.id] = g.tag_id ? `${g.name} (#${g.tag_id})` : g.name; 
      });
    }

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const in1DayStr = new Date(now.getTime() + 1 * 86400000).toISOString().split("T")[0];
    const in2DaysStr = new Date(now.getTime() + 2 * 86400000).toISOString().split("T")[0];
    const in7DaysStr = new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0];

    const overdue: Array<{ title: string; goatName: string }> = [];
    const dueToday: Array<{ title: string; goatName: string }> = [];
    const upcomingSoon: Array<{ title: string; goatName: string; daysLeft: number }> = [];

    if (events) {
      events.forEach((ev: any) => {
        if (!ev.date) return;

        const isScheduledTask =
          (ev.title && ev.title.toLowerCase().startsWith("scheduled")) ||
          ev.is_scheduled === true ||
          ev.status === "pending" ||
          ev.type === "Scheduled Task" ||
          hasRepeatFrequency(ev);

        if (!isScheduledTask) return;

        const evDateStr = ev.date.split("T")[0];
        const goatName = ev.goat_id ? (goatsMap[ev.goat_id] || "Goat") : "Herd";
        const title = ev.title?.replace(/^Scheduled:\s*/i, "") || ev.type || "Farm Task";

        if (evDateStr < todayStr) {
          overdue.push({ title, goatName });
        } else if (evDateStr === todayStr) {
          dueToday.push({ title, goatName });
        } else if (evDateStr === in1DayStr) {
          upcomingSoon.push({ title, goatName, daysLeft: 1 });
        } else if (evDateStr === in2DaysStr) {
          upcomingSoon.push({ title, goatName, daysLeft: 2 });
        } else if (evDateStr === in7DaysStr) {
          upcomingSoon.push({ title, goatName, daysLeft: 7 });
        }
      });
    }

    if (dueToday.length === 0 && overdue.length === 0 && upcomingSoon.length === 0 && !isManualTest) {
      return new Response(JSON.stringify({ success: true, message: "Clean check: No pending or upcoming tasks due. No notification sent." }), { headers });
    }

    let title = "Beit Minerva Farm";
    let body = "";

    if (dueToday.length > 0 || overdue.length > 0) {
      if (dueToday.length > 0 && overdue.length > 0) {
        title = `Scheduled Tasks Alert (${dueToday.length} Due Today, ${overdue.length} Overdue)`;
        const sampleToday = dueToday.slice(0, 2).map(t => `• ${t.title} (${t.goatName})`).join("\n");
        body = `${sampleToday}\n+ ${overdue.length} overdue task(s) require attention.`;

      } else if (dueToday.length > 0) {
        if (dueToday.length === 1) {
          title = `Task Due Today: ${dueToday[0].title}`;
          body = `Scheduled for ${dueToday[0].goatName}. Tap to view details.`;
        } else {
          title = `${dueToday.length} Scheduled Tasks Due Today`;
          const sampleList = dueToday.slice(0, 3).map(t => `• ${t.title} (${t.goatName})`).join("\n");
          const remaining = dueToday.length - 3;
          body = remaining > 0 ? `${sampleList}\n+ ${remaining} more task(s) due today.` : sampleList;
        }

      } else {
        if (overdue.length === 1) {
          title = `Overdue Task: ${overdue[0].title}`;
          body = `Scheduled for ${overdue[0].goatName}. Requires attention.`;
        } else {
          title = `${overdue.length} Overdue Scheduled Tasks`;
          const sampleList = overdue.slice(0, 3).map(t => `• ${t.title} (${t.goatName})`).join("\n");
          const remaining = overdue.length - 3;
          body = remaining > 0 ? `${sampleList}\n+ ${remaining} more overdue task(s).` : sampleList;
        }
      }

    } else if (upcomingSoon.length > 0) {
      const firstUpcoming = upcomingSoon[0];
      const timeWord = firstUpcoming.daysLeft === 1 ? "Tomorrow" : `In ${firstUpcoming.daysLeft} Days`;

      if (upcomingSoon.length === 1) {
        title = `Upcoming Task (${timeWord}): ${firstUpcoming.title}`;
        body = `Scheduled for ${firstUpcoming.goatName}. Prepare supplies or vet visit.`;
      } else {
        title = `Upcoming Farm Tasks (${upcomingSoon.length} Tasks ${timeWord})`;
        const sampleList = upcomingSoon.slice(0, 3).map(t => `• ${t.title} (${t.goatName})`).join("\n");
        const remaining = upcomingSoon.length - 3;
        body = remaining > 0 ? `${sampleList}\n+ ${remaining} more upcoming task(s).` : sampleList;
      }

    } else {
      title = "Beit Minerva Farm";
      body = "Notifications active and working on your device.";
    }

    const tag = `farm-tasks-${todayStr}`;
    const targetSiteUrl = Deno.env.get("SITE_URL") || "https://beitminerva.github.io/BeitMinerva/";
    const logoUrl = `${targetSiteUrl}logo.png`;

    const payloadStr = JSON.stringify({
      title,
      body,
      url: targetSiteUrl,
      tag,
      icon: logoUrl,
      image: logoUrl,
      renotify: true
    });

    const options = {
      vapidDetails: {
        subject: VAPID_EMAIL,
        publicKey: VAPID_PUBLIC_KEY,
        privateKey: VAPID_PRIVATE_KEY
      }
    };

    let sentCount = 0;
    let lastError: any = null;

    for (const sub of subs) {
      const pushObj = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(pushObj, payloadStr, options);
        sentCount++;
      } catch (err: any) {
        console.error(`Push failed for ${sub.endpoint.slice(-15)}:`, err);
        lastError = {
          message: err.message,
          statusCode: err.statusCode || null,
          body: err.body || null
        };
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sentCount,
      totalCount: subs.length,
      title,
      body,
      lastError
    }), { headers });

  } catch (err: any) {
    console.error("Edge function handler error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
});
