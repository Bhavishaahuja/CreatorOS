import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { profileId, rejectedHooks = [] } = await request.json();
  if (!profileId) {
    return NextResponse.json({ error: "No profile ID" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Fetch available dates from calendar
  let availableDays: string[] = [];
  let contentOpportunities: { date: string; title: string }[] = [];

  try {
    const calendarRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/events?profileId=${profileId}`
    );
    if (calendarRes.ok) {
      const calendarData = await calendarRes.json();
      availableDays = calendarData.availableDays || [];
      contentOpportunities = calendarData.contentOpportunities || [];
    }
  } catch {
    // Calendar not connected — continue without it
  }

    // Fetch similar approved and rejected ideas from vector DB
  let ragApproved: string[] = [];
  let ragRejected: string[] = [];

  try {
    // Generate a generic embedding to query with (based on profile)
    const profileText = `${profile.content_type?.join(", ")} ${profile.audience} ${profile.brand_type}`;
    
    const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: profileText,
      }),
    });

    const embeddingData = await embeddingRes.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;

    if (queryEmbedding) {
      // Fetch 5 most similar approved ideas
      const { data: approvedMatches } = await supabase.rpc("match_embeddings", {
        query_embedding: queryEmbedding,
        match_status: "approved",
        match_profile_id: profileId,
        match_count: 5,
      });

      // Fetch 5 most similar rejected ideas
      const { data: rejectedMatches } = await supabase.rpc("match_embeddings", {
        query_embedding: queryEmbedding,
        match_status: "rejected",
        match_profile_id: profileId,
        match_count: 5,
      });

      if (approvedMatches?.length) {
        const ids = approvedMatches.map((m: { suggestion_id: string }) => m.suggestion_id);
        const { data: approvedIdeas } = await supabase
          .from("content_suggestions")
          .select("hook")
          .in("id", ids);
        ragApproved = approvedIdeas?.map((i: { hook: string }) => i.hook) || [];
      }

      if (rejectedMatches?.length) {
        const ids = rejectedMatches.map((m: { suggestion_id: string }) => m.suggestion_id);
        const { data: rejectedIdeas } = await supabase
          .from("content_suggestions")
          .select("hook")
          .in("id", ids);
        ragRejected = rejectedIdeas?.map((i: { hook: string }) => i.hook) || [];
      }
    }
  } catch {
    // RAG unavailable — continue without it
  }
  // Build prompt
  const prompt = `You are a content strategist for Instagram creators.

User profile:
- Content type: ${profile.content_type?.join(", ")}
- Audience: ${profile.audience}
- Content style: ${profile.brand_type}
- Goal: ${profile.goal}
- Posts per week target: ${profile.posts_per_week}

Their available shooting days in the next 4 weeks: ${availableDays.slice(0, 14).join(", ") || "flexible"}
Upcoming events that could be content opportunities: ${contentOpportunities.map((e) => `${e.title} on ${e.date}`).join(", ") || "none"}

Generate exactly 10 Instagram content ideas for this creator.
For each idea return JSON with:
- id (1-10)
- format: "reel" or "carousel" or "story"
- hook: the opening line or visual hook (max 15 words)
- concept: what the content is about (2-3 sentences)
- suggested_post_date: pick from their available days, or suggest a date in the next 4 weeks
- why: one sentence on why this fits their goal and audience

Return only a valid JSON array. No explanation outside the JSON.${ragApproved.length > 0 ? `\n\nThis creator has previously loved ideas like these — lean into similar themes: ${ragApproved.join(", ")}` : ""}${ragRejected.length > 0 ? `\n\nThey have rejected ideas like these — avoid similar concepts: ${ragRejected.join(", ")}` : ""}${rejectedHooks.length > 0 ? `\n\nAlso do NOT suggest ideas similar to these just-rejected concepts: ${rejectedHooks.join(", ")}` : ""}`;

  // Call Claude via OpenRouter
  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const aiData = await aiRes.json();
  const rawContent = aiData.content?.[0]?.text;

  if (!rawContent) {
    return NextResponse.json({ error: "AI returned no content" }, { status: 500 });
  }

  // Parse JSON from response
  let suggestions;
  try {
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    suggestions = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
  } catch {
    console.log("First parse failed, retrying with stricter prompt...");
    const retryRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: `${prompt}\n\nCRITICAL: Return ONLY a valid JSON array. No markdown, no code blocks, no explanation. Start your response with [ and end with ].`,
        }],
      }),
    });
    const retryData = await retryRes.json();
    const retryContent = retryData.content?.[0]?.text;
    try {
      const jsonMatch = retryContent?.match(/\[[\s\S]*\]/);
      suggestions = JSON.parse(jsonMatch ? jsonMatch[0] : retryContent);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response after retry" }, { status: 500 });
    }
  }

  // Save suggestions to Supabase
  const suggestionsToInsert = suggestions.map((s: {
    format: string;
    hook: string;
    concept: string;
    suggested_post_date: string;
    why: string;
  }) => ({
    user_profile_id: profileId,
    format: s.format,
    hook: s.hook,
    concept: s.concept,
    suggested_post_date: s.suggested_post_date,
    why: s.why,
    status: "pending",
    prompt_version: "v1.0",
  }));

  const { data: savedSuggestions, error: insertError } = await supabase
    .from("content_suggestions")
    .insert(suggestionsToInsert)
    .select();

  if (insertError) {
      console.log("Supabase insert error:", JSON.stringify(insertError));
      return NextResponse.json({ error: "Failed to save suggestions" }, { status: 500 });
    }

  return NextResponse.json({ suggestions: savedSuggestions });
}