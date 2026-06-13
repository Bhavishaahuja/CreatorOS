"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Calendar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const connected = searchParams.get("connected");
  const error = searchParams.get("error");
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("profile_id");
    setProfileId(id);
    if (connected === "true") {
      setTimeout(() => router.push("/suggestions"), 1500);
    }
  }, [connected, router]);

  const handleConnect = () => {
    window.location.href = `/api/auth/google?state=${profileId}`;
  };

  const handleSkip = () => {
    router.push("/availability");
  };

  if (connected === "true") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-xl font-semibold text-zinc-900">Calendar connected</h2>
          <p className="text-sm text-zinc-400 mt-2">Building your content plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 text-center">
        <div className="text-5xl mb-6">📅</div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Connect your Google Calendar</h2>
        <p className="text-sm text-zinc-400 mb-8 max-w-sm mx-auto">
          CreatorOS reads your schedule to suggest content ideas only on days you are actually free to shoot.
        </p>

        {error && (
          <p className="text-sm text-red-400 mb-4">Something went wrong. Please try again.</p>
        )}

        <button
          onClick={handleConnect}
          className="w-full py-3 bg-black text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-all mb-3"
        >
          Connect Google Calendar
        </button>

        <button
          onClick={handleSkip}
          className="w-full py-3 text-zinc-400 text-sm hover:text-zinc-600 transition-all"
        >
          Skip for now — I'll enter my availability manually
        </button>
      </div>
    </div>
  );
}