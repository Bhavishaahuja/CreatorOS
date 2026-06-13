import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function getValidToken(supabase: ReturnType<typeof createClient>, profileId: string) {
  const { data } = await supabase
    .from("calendar_tokens")
    .select("*")
    .eq("user_profile_id", profileId)
    .single();

  if (!data) return null;

  // Check if token is expired — refresh if needed
  if (new Date(data.expires_at) <= new Date()) {
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: data.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const refreshed = await refreshRes.json();
    if (refreshed.error) return null;

    await supabase.from("calendar_tokens").update({
      access_token: refreshed.access_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    }).eq("user_profile_id", profileId);

    return refreshed.access_token;
  }

  return data.access_token;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");

  if (!profileId) return NextResponse.json({ error: "No profile ID" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const token = await getValidToken(supabase, profileId);
  if (!token) return NextResponse.json({ error: "No valid token" }, { status: 401 });

  const now = new Date();
  const fourWeeksLater = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

  const eventsRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: fourWeeksLater.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
    }),
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const eventsData = await eventsRes.json();
  const events = eventsData.items || [];

  // Parse into two buckets
  const availableDays: string[] = [];
  const contentOpportunities: { date: string; title: string }[] = [];

  const busyDates = new Set(
    events.map((e: { start: { date?: string; dateTime?: string } }) =>
      (e.start.date || e.start.dateTime || "").split("T")[0]
    )
  );

  // Find free days in next 4 weeks
  for (let i = 1; i <= 28; i++) {
    const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    if (!busyDates.has(dateStr)) {
      availableDays.push(dateStr);
    }
  }

  // Flag events as content opportunities
  events.forEach((e: { summary?: string; start: { date?: string; dateTime?: string } }) => {
    if (e.summary) {
      contentOpportunities.push({
        date: (e.start.date || e.start.dateTime || "").split("T")[0],
        title: e.summary,
      });
    }
  });

  return NextResponse.json({ availableDays, contentOpportunities });
}