import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const { suggestionId, userProfileId, hook, concept, status } = await request.json();

  if (!suggestionId || !hook || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Generate embedding via OpenAI
  const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: `${hook} ${concept}`,
    }),
  });

  const embeddingData = await embeddingRes.json();
  const embedding = embeddingData.data?.[0]?.embedding;

  if (!embedding) {
    return NextResponse.json({ error: "Failed to generate embedding" }, { status: 500 });
  }

  // Store in Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await supabase.from("idea_embeddings").insert([{
    suggestion_id: suggestionId,
    user_profile_id: userProfileId,
    embedding,
    status,
  }]);

  if (error) {
    console.error("Embedding insert error:", JSON.stringify(error));
    return NextResponse.json({ error: "Failed to store embedding" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}