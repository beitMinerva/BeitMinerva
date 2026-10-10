import { farmDate, addFarmDays } from '../_shared/farmTime.js';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://tlneqawnaifeipudbwjq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "BP0hZFBqEATCuSp6r9q52vA7sqGhb0Hkc7j1Keix9hBApQsDjcWX3pKdW9fJfK9FXlbNe0TA2WAJDQ38CvHBL_w";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "7mtrSYs6IbpFuwdYFRyTjJbumP0a1tdZNzxUXENbKYw";
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") || "mailto:admin@beitminerva.farm";

function parseCustomFields(custom: any): Record<string, any> {
  if (!custom) return {};
  if (typeof custom === "string") {
    try { return JSON.parse(custom); } catch { return {}; }
  }
  if (typeof custom === "object") return custom;
  return {};
}

function hasRepeatFrequency(ev: any): boolean {
  if (ev.repeat_frequency && ev.repeat_frequency !== "none") return true;
  const custom = parseCustomFields(ev.custom_fields);
  return Boolean(custom.repeat_frequency && custom.repeat_frequency !== "none");
}

serve(async (req) => {
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  });

  if (req.method === "OPTIONS") return new Response("ok", { headers });

  try {
    const isManualTest = new URL(req.url).searchParams.get("test") === "true";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: subs, error: subErr } = await supabase.from("push_subscriptions").select("*");
    if (subErr || !subs || subs.length === 0) {
      return new Response(JSON.stringify({
        success: true, message: "No active push subscriptions found in DB."
      }), { headers });
    }

    const { data: goats } = await supabase.from("goats").select("id, name, tag_id, gender, status");
    const { data: events } = await supabase.from("timeline_events").select("*");
    const goatsMap: Record<string, any> = {};
    if (goats) goats.forEach((g: any) => { goatsMap[g.id] = g; });

    const now = new Date();
    const todayStr = farmDate(now);
    const in3DaysStr = addFarmDays(now, 3);
    const urgentAlerts: Array<string> = [];
    const todayAlerts: Array<string> = [];
    const upcomingAlerts: Array<string> = [];
    const overdueTasks: Array<{ title: string; goatName: string }> = [];

    // 1. SCHEDULED TASKS & URGENCY EVALUATION
    if (events) {
      events.forEach((ev: any) => {
        if (!ev.date || ev.status === "completed") return;
        const isScheduledTask =
          (ev.title && ev.title.toLowerCase().startsWith("scheduled")) ||
          ev.is_scheduled === true || ev.status === "pending" ||
          ev.type === "Scheduled Task" || hasRepeatFrequency(ev);
        if (!isScheduledTask) return;

        const custom = parseCustomFields(ev.custom_fields);
        const urgency = custom.urgency || "normal";
        const evDateStr = farmDate(ev.date);
        if (!evDateStr) return;
        const goat = ev.goat_id ? goatsMap[ev.goat_id] : null;
        const goatName = goat ? `${goat.name}${goat.tag_id ? ` (#${goat.tag_id})` : ""}` : "Herd";
        const title = ev.title?.replace(/^Scheduled:\s*/i, "") || ev.type || "Task";

        if (evDateStr < todayStr) {
          overdueTasks.push({ title, goatName });
          if (urgency === "urgent") urgentAlerts.push(`[Urgent Overdue] ${title} (${goatName})`);
        } else if (evDateStr === todayStr) {
          if (urgency === "urgent") urgentAlerts.push(`[Urgent Today] ${title} (${goatName})`);
          else todayAlerts.push(`${title} (${goatName})`);
        } else if (evDateStr <= in3DaysStr && (urgency === "urgent" || urgency === "high")) {
          upcomingAlerts.push(`[Priority] ${title} (${goatName}) on ${evDateStr}`);
        }
      });
    }

    // 2. GESTATION & KIDDING ALERTS (~150 days)
    if (events && goats) {
      const matingEvents = events.filter((e: any) =>
        e.status !== "cancelled" && (e.type === "Mating" || e.type === "Pregnancy" ||
          /mating|breeding|pregnant/i.test(e.title || ""))
      );
      const seenGoats = new Set<string>();
      matingEvents.forEach((ev: any) => {
        if (!ev.goat_id || seenGoats.has(ev.goat_id)) return;
        const doe = goatsMap[ev.goat_id];
        if (!doe || doe.gender === "Buck" || doe.gender === "Male") return;
        const matingTime = new Date(ev.date).getTime();
        if (Number.isNaN(matingTime)) return;
        const hadSubsequentBirth = events.some((be: any) =>
          be.goat_id === doe.id && (be.type === "Birth" || /kidded|birth|delivered/i.test(be.title || "")) &&
          new Date(be.date).getTime() > matingTime
        );
        if (hadSubsequentBirth) return;
        seenGoats.add(doe.id);

        const expectedDateStr = addFarmDays(ev.date, 150);
        const diffDays = Math.round((
          new Date(`${expectedDateStr}T12:00:00Z`).getTime() -
          new Date(`${todayStr}T12:00:00Z`).getTime()
        ) / 86400000);
        if (diffDays <= 0) urgentAlerts.push(`[Kidding Due] ${doe.name} is due for kidding`);
        else if (diffDays <= 7) urgentAlerts.push(`[Kidding Soon] ${doe.name} due in ~${diffDays} day(s)`);
      });
    }

    // 3. MEDICATION WITHDRAWAL SAFETY ALERTS
    // Withdrawal durations remain elapsed 24-hour periods.
    if (events) {
      events.forEach((ev: any) => {
        const custom = parseCustomFields(ev.custom_fields);
        let withdrawalDays = Number(custom.withdrawal_days || 0);
        if (!withdrawalDays && ev.notes) {
          const match = ev.notes.match(/withdrawal[:\s]+(\d+)\s*d/i);
          if (match) withdrawalDays = parseInt(match[1], 10);
        }
        if (withdrawalDays > 0) {
          const evTime = new Date(ev.date).getTime();
          if (!Number.isNaN(evTime)) {
            const endTime = evTime + withdrawalDays * 86400000;
            if (endTime > now.getTime()) {
              const daysLeft = Math.ceil((endTime - now.getTime()) / 86400000);
              const goat = ev.goat_id ? goatsMap[ev.goat_id] : null;
              const goatName = goat ? goat.name : "Goat";
              urgentAlerts.push(`[Withdrawal Alert] ${goatName} in active withdrawal for ${daysLeft}d - do not sell milk`);
            }
          }
        }
      });
    }

    const totalActiveAlerts = urgentAlerts.length + todayAlerts.length + overdueTasks.length + upcomingAlerts.length;
    if (totalActiveAlerts === 0 && !isManualTest) {
      return new Response(JSON.stringify({
        success: true, message: "Clean check: No pending or urgent farm alerts due. No notification sent."
      }), { headers });
    }

    let title = "Beit Minerva Farm Alert";
    let body = "";
    if (urgentAlerts.length > 0) {
      title = `${urgentAlerts.length} Urgent Farm Action(s) Required`;
      body = urgentAlerts.slice(0, 3).map(a => `? ${a}`).join("\n");
      if (todayAlerts.length > 0) body += `\n+ ${todayAlerts.length} regular task(s) due today.`;
    } else if (todayAlerts.length > 0) {
      if (todayAlerts.length === 1) {
        title = `Task Due Today: ${todayAlerts[0]}`;
        body = "Scheduled for today. Tap to view and mark complete.";
      } else {
        title = `${todayAlerts.length} Tasks Due Today`;
        body = todayAlerts.slice(0, 3).map(t => `? ${t}`).join("\n");
        if (overdueTasks.length > 0) body += `\n+ ${overdueTasks.length} overdue task(s).`;
      }
    } else if (overdueTasks.length > 0) {
      title = `${overdueTasks.length} Overdue Task(s)`;
      body = overdueTasks.slice(0, 2).map(t => `? ${t.title} (${t.goatName})`).join("\n");
      if (overdueTasks.length > 2) body += `\n+ ${overdueTasks.length - 2} more overdue task(s).`;
    } else if (upcomingAlerts.length > 0) {
      title = "Upcoming Priority Tasks";
      body = upcomingAlerts.slice(0, 3).map(a => `? ${a}`).join("\n");
    } else {
      title = "Beit Minerva Farm";
      body = "Notifications active and working on your device.";
    }

    const targetSiteUrl = Deno.env.get("SITE_URL") || "https://beitminerva.github.io/BeitMinerva/";
    const logoUrl = `${targetSiteUrl}logo.png`;
    const payloadStr = JSON.stringify({
      title, body, url: targetSiteUrl, tag: `farm-briefing-${todayStr}`,
      icon: logoUrl, image: logoUrl, renotify: true
    });
    const options = { vapidDetails: {
      subject: VAPID_EMAIL, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY
    } };
    let sentCount = 0;
    let lastError: any = null;
    for (const sub of subs) {
      const pushObj = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
      try {
        await webpush.sendNotification(pushObj, payloadStr, options);
        sentCount++;
      } catch (err: any) {
        console.error(`Push failed for ${sub.endpoint.slice(-15)}:`, err);
        lastError = { message: err.message, statusCode: err.statusCode || null, body: err.body || null };
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }
    return new Response(JSON.stringify({
      success: true, sentCount, totalCount: subs.length, title, body, lastError
    }), { headers });
  } catch (err: any) {
    console.error("Edge function handler error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
});
