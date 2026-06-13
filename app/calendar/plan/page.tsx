"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CalendarItem = {
  id: string;
  hook: string;
  format: string;
  shoot_date: string;
  edit_date: string;
  post_date: string;
};

const formatColors: Record<string, string> = {
  reel: "bg-purple-100 text-purple-700",
  carousel: "bg-blue-100 text-blue-700",
  story: "bg-orange-100 text-orange-700",
};

export default function CalendarPlan() {
  const router = useRouter();
  const [calendar, setCalendar] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const profileId = localStorage.getItem("profile_id");
    const approvedIds = JSON.parse(localStorage.getItem("approved_ids") || "[]");

    if (!profileId || !approvedIds.length) {
      router.push("/suggestions");
      return;
    }

    generateCalendar(profileId, approvedIds);
  }, [router]);

  const generateCalendar = async (profileId: string, approvedIds: string[]) => {
    try {
      const res = await fetch("/api/calendar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, approvedIds }),
      });
      const data = await res.json();
      console.log("generate response:", data);
      if (data.error) throw new Error(data.error);
      setCalendar(data.calendar);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const text = calendar
      .sort((a, b) => new Date(a.post_date).getTime() - new Date(b.post_date).getTime())
      .map(
        (item) =>
          `${item.hook}\n  Shoot: ${item.shoot_date} | Edit: ${item.edit_date} | Post: ${item.post_date}`
      )
      .join("\n\n");
    navigator.clipboard.writeText(text);
    alert("Calendar copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📅</div>
          <h2 className="text-xl font-semibold text-zinc-900">Building your calendar...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.push("/suggestions")}
            className="px-5 py-2.5 bg-black text-white text-sm rounded-xl"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const sorted = [...calendar].sort(
    (a, b) => new Date(a.post_date).getTime() - new Date(b.post_date).getTime()
  );

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Your content calendar</h1>
            <p className="text-sm text-zinc-400 mt-1">{calendar.length} pieces planned</p>
          </div>
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 border border-zinc-200 text-zinc-600 text-sm rounded-xl hover:border-zinc-400 transition-all"
          >
            Copy to clipboard
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-zinc-50 border-b border-zinc-100">
            <p className="text-xs font-medium text-zinc-400">Content</p>
            <p className="text-xs font-medium text-zinc-400">Shoot</p>
            <p className="text-xs font-medium text-zinc-400">Edit</p>
            <p className="text-xs font-medium text-zinc-400">Post</p>
          </div>

          {sorted.map((item, index) => (
            <div
              key={item.id}
              className={`grid grid-cols-4 gap-4 px-6 py-4 items-center ${
                index !== sorted.length - 1 ? "border-b border-zinc-50" : ""
              }`}
            >
              <div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full mb-1 inline-block ${
                    formatColors[item.format] || "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {item.format}
                </span>
                <p className="text-sm text-zinc-800 font-medium leading-snug">{item.hook}</p>
              </div>
              <p className="text-sm text-zinc-500">{item.shoot_date}</p>
              <p className="text-sm text-zinc-500">{item.edit_date}</p>
              <p className="text-sm font-medium text-zinc-900">{item.post_date}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/suggestions")}
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-all"
          >
            Back to ideas
          </button>
        </div>

      </div>
    </div>
  );
}