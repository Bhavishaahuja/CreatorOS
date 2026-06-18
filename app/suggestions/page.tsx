"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Suggestion = {
  id: string;
  format: string;
  hook: string;
  concept: string;
  suggested_post_date: string;
  why: string;
  status: string;
};

const formatColors: Record<string, string> = {
  reel: "bg-purple-100 text-purple-700",
  carousel: "bg-blue-100 text-blue-700",
  story: "bg-orange-100 text-orange-700",
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Suggestions() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approved, setApproved] = useState<string[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customHook, setCustomHook] = useState("");
  const [customFormat, setCustomFormat] = useState("reel");
  const [customDate, setCustomDate] = useState("");
  const [savingCustom, setSavingCustom] = useState(false);

  useEffect(() => {
    const profileId = localStorage.getItem("profile_id");
    if (!profileId) {
      router.push("/onboarding");
      return;
    }
    generateSuggestions(profileId, []);
  }, [router]);

  const generateSuggestions = async (profileId: string, rejectedHooks: string[]) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, rejectedHooks }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuggestions((prev) => [...prev, ...data.suggestions]);
    } catch (err) {
      setError("Something went wrong generating your suggestions. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (id: string) => {
    setApproved((prev) => [...prev, id]);
  };

  const handleReject = (id: string) => {
    setRejected((prev) => [...prev, id]);
  };

  const handleGenerateMore = () => {
    const profileId = localStorage.getItem("profile_id") || "";
    const rejectedHooks = suggestions
      .filter((s) => rejected.includes(s.id))
      .map((s) => s.hook);
    generateSuggestions(profileId, rejectedHooks);
  };

  const handleAddCustomIdea = async () => {
    if (!customHook.trim() || !customDate) return;
    setSavingCustom(true);
    const profileId = localStorage.getItem("profile_id");
    try {
      const { data, error } = await supabase
        .from("content_suggestions")
        .insert([{
          user_profile_id: profileId,
          format: customFormat,
          hook: customHook.trim(),
          concept: "Custom idea added by creator",
          suggested_post_date: customDate,
          why: "Added manually by creator",
          status: "approved",
          user_generated: true,
          prompt_version: "custom",
        }])
        .select()
        .single();

      if (error) throw error;

      setSuggestions((prev) => [...prev, data]);
      setApproved((prev) => [...prev, data.id]);
      setCustomHook("");
      setCustomDate("");
      setCustomFormat("reel");
      setShowCustomForm(false);
    } catch (err) {
      console.error("Failed to save custom idea:", err);
      alert("Something went wrong saving your idea. Try again.");
    } finally {
      setSavingCustom(false);
    }
  };

  const pending = suggestions.filter(
    (s) => !approved.includes(s.id) && !rejected.includes(s.id)
  );

  if (loading && suggestions.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">✦</div>
          <h2 className="text-xl font-semibold text-zinc-900">Building your content plan...</h2>
          <p className="text-sm text-zinc-400 mt-2">This takes about 10 seconds</p>
        </div>
      </div>
    );
  }

  if (error && suggestions.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => generateSuggestions(localStorage.getItem("profile_id") || "", [])}
            className="px-5 py-2.5 bg-black text-white text-sm rounded-xl"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">Your content ideas</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {approved.length} approved · {pending.length} remaining
          </p>
        </div>

        {/* Approved banner */}
        {approved.length > 0 && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
            <p className="text-sm text-green-700 font-medium">
              {approved.length} idea{approved.length > 1 ? "s" : ""} approved
            </p>
            {approved.length >= 2 && (
              <button
                onClick={() => {
                  localStorage.setItem("approved_ids", JSON.stringify(approved));
                  router.push("/calendar/plan");
                }}
                className="text-sm font-medium text-green-700 underline"
              >
                Build my calendar →
              </button>
            )}
          </div>
        )}

        {/* Suggestion cards */}
        <div className="flex flex-col gap-4">
          {suggestions.map((s) => {
            const isApproved = approved.includes(s.id);
            const isRejected = rejected.includes(s.id);

            return (
              <div
                key={s.id}
                className={`bg-white rounded-2xl border p-6 transition-all ${
                  isApproved
                    ? "border-green-200 opacity-60"
                    : isRejected
                    ? "border-zinc-100 opacity-30"
                    : "border-zinc-100"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      formatColors[s.format] || "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {s.format}
                  </span>
                  <span className="text-xs text-zinc-400">{s.suggested_post_date}</span>
                </div>

                <h3 className="text-base font-semibold text-zinc-900 mb-2">{s.hook}</h3>
                <p className="text-sm text-zinc-500 mb-3">{s.concept}</p>

                <div className="bg-zinc-50 rounded-lg px-4 py-3 mb-4">
                  <p className="text-xs text-zinc-400">
                    <span className="font-medium text-zinc-500">Why this works: </span>
                    {s.why}
                  </p>
                </div>

                {!isApproved && !isRejected && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(s.id)}
                      className="flex-1 py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-all"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(s.id)}
                      className="flex-1 py-2.5 border border-zinc-200 text-zinc-500 text-sm rounded-xl hover:border-zinc-400 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {isApproved && (
                  <p className="text-sm text-green-600 font-medium">✓ Approved</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom idea form */}
        <div className="mt-6">
          {!showCustomForm ? (
            <button
              onClick={() => setShowCustomForm(true)}
              className="w-full py-3 border border-dashed border-zinc-300 text-zinc-400 text-sm rounded-2xl hover:border-zinc-400 hover:text-zinc-500 transition-all"
            >
              + Add your own idea
            </button>
          ) : (
            <div className="bg-white border border-zinc-100 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">Add your own idea</h3>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Your hook or idea title"
                  value={customHook}
                  onChange={(e) => setCustomHook(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-800 placeholder-zinc-300 focus:outline-none focus:border-zinc-400"
                />
                <div className="flex gap-3">
                  <select
                    value={customFormat}
                    onChange={(e) => setCustomFormat(e.target.value)}
                    className="flex-1 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-800 focus:outline-none focus:border-zinc-400"
                  >
                    <option value="reel">Reel</option>
                    <option value="carousel">Carousel</option>
                    <option value="story">Story</option>
                  </select>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="flex-1 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-800 focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div className="flex gap-3 mt-1">
                  <button
                    onClick={handleAddCustomIdea}
                    disabled={savingCustom || !customHook.trim() || !customDate}
                    className="flex-1 py-2.5 bg-black text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-40"
                  >
                    {savingCustom ? "Saving..." : "Add idea"}
                  </button>
                  <button
                    onClick={() => setShowCustomForm(false)}
                    className="flex-1 py-2.5 border border-zinc-200 text-zinc-500 text-sm rounded-xl hover:border-zinc-400 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Generate more */}
        {pending.length === 0 && rejected.length > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={handleGenerateMore}
              disabled={loading}
              className="px-5 py-2.5 border border-zinc-200 text-zinc-600 text-sm rounded-xl hover:border-zinc-400 transition-all disabled:opacity-40"
            >
              {loading ? "Generating..." : "Generate 10 more ideas"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}