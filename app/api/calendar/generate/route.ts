import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { profileId, approvedIds } = await request.json();

  if (!profileId || !approvedIds?.length) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: suggestions, error } = await supabase
    .from("content_suggestions")
    .select("*")
    .in("id", approvedIds);

  if (error || !suggestions) {
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
  }

  const calendarItems = suggestions.map((s) => {
    const postDate = new Date(s.suggested_post_date);
    const editDate = new Date(postDate);
    editDate.setDate(postDate.getDate() - 2);
    const shootDate = new Date(postDate);
    shootDate.setDate(postDate.getDate() - 5);

    return {
      suggestion_id: s.id,
      user_profile_id: profileId,
      shoot_date: shootDate.toISOString().split("T")[0],
      edit_date: editDate.toISOString().split("T")[0],
      post_date: postDate.toISOString().split("T")[0],
      format: s.format,
      hook: s.hook,
    };
  });

  const { data: calendar, error: calendarError } = await supabase
    .from("content_calendar")
    .insert(calendarItems)
    .select();

  if (calendarError) {
    console.log("Calendar insert error:", JSON.stringify(calendarError));
    return NextResponse.json({ error: "Failed to save calendar" }, { status: 500 });
  }

  return NextResponse.json({ calendar });
}