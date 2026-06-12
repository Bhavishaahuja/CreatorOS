"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const CONTENT_TYPES = ["Lifestyle", "Fitness", "Fashion", "Food", "Tech", "Travel", "Other"];
const GOALS = ["Grow followers", "Increase engagement", "Build community", "Monetize"];
const CONTENT_STYLES = ["Educational", "Entertaining", "Inspirational", "Aesthetic"];

type UserProfile = {
  content_type: string[];
  audience: string;
  content_style: string;
  goal: string;
  posts_per_week: number;
};

const defaultProfile: UserProfile = {
  content_type: [],
  audience: "",
  content_style: "",
  goal: "",
  posts_per_week: 3,
};

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [saving, setSaving] = useState(false);

  // Load partial progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("onboarding_progress");
    if (saved) {
      const parsed = JSON.parse(saved);
      setProfile(parsed.profile || defaultProfile);
      setStep(parsed.step || 1);
    }
  }, []);

  // Save partial progress on every change
  useEffect(() => {
    localStorage.setItem("onboarding_progress", JSON.stringify({ profile, step }));
  }, [profile, step]);

  const toggleContentType = (type: string) => {
    setProfile((prev) => ({
      ...prev,
      content_type: prev.content_type.includes(type)
        ? prev.content_type.filter((t) => t !== type)
        : [...prev.content_type, type],
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error } = await supabase.from("user_profiles").insert([{
        content_type: profile.content_type,
        audience: profile.audience,
        brand_type: profile.content_style,
        goal: profile.goal,
        posts_per_week: profile.posts_per_week,
      }]);
      if (error) throw error;
      localStorage.removeItem("onboarding_progress");
      router.push("/dashboard");
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-zinc-400 mb-2">
            <span>Step {step} of 5</span>
            <span>{Math.round((step / 5) * 100)}%</span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-1.5">
            <div
              className="bg-black h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1 — Content type */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">What kind of content do you create?</h2>
            <p className="text-sm text-zinc-400 mb-6">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleContentType(type)}
                  className={`px-4 py-2 rounded-full text-sm border transition-all ${
                    profile.content_type.includes(type)
                      ? "bg-black text-white border-black"
                      : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Audience */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">Who is your audience?</h2>
            <p className="text-sm text-zinc-400 mb-6">Describe them in your own words</p>
            <textarea
              className="w-full border border-zinc-200 rounded-xl p-4 text-sm text-zinc-800 placeholder-zinc-300 focus:outline-none focus:border-zinc-400 resize-none"
              rows={4}
              placeholder="e.g. women 25-35 interested in wellness and self-improvement"
              value={profile.audience}
              onChange={(e) => setProfile((prev) => ({ ...prev, audience: e.target.value }))}
            />
          </div>
        )}

        {/* Step 3 — Content style */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">How would you describe your content style?</h2>
            <p className="text-sm text-zinc-400 mb-6">Pick the one that feels most like you</p>
            <div className="flex flex-col gap-3">
              {CONTENT_STYLES.map((style) => (
                <button
                  key={style}
                  onClick={() => setProfile((prev) => ({ ...prev, content_style: style }))}
                  className={`w-full py-4 px-5 rounded-xl border text-sm text-left font-medium transition-all ${
                    profile.content_style === style
                      ? "bg-black text-white border-black"
                      : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 — Goal */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">What is your main goal right now?</h2>
            <p className="text-sm text-zinc-400 mb-6">Pick one</p>
            <div className="flex flex-col gap-3">
              {GOALS.map((goal) => (
                <button
                  key={goal}
                  onClick={() => setProfile((prev) => ({ ...prev, goal }))}
                  className={`w-full py-4 px-5 rounded-xl border text-sm text-left font-medium transition-all ${
                    profile.goal === goal
                      ? "bg-black text-white border-black"
                      : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5 — Posts per week */}
        {step === 5 && (
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">How many posts per week are you aiming for?</h2>
            <p className="text-sm text-zinc-400 mb-6">Be realistic — consistency matters more than frequency</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setProfile((prev) => ({ ...prev, posts_per_week: Math.max(1, prev.posts_per_week - 1) }))}
                className="w-10 h-10 rounded-full border border-zinc-200 text-zinc-600 text-lg hover:border-zinc-400 transition-all"
              >
                -
              </button>
              <span className="text-4xl font-semibold text-zinc-900 w-12 text-center">
                {profile.posts_per_week}
              </span>
              <button
                onClick={() => setProfile((prev) => ({ ...prev, posts_per_week: Math.min(7, prev.posts_per_week + 1) }))}
                className="w-10 h-10 rounded-full border border-zinc-200 text-zinc-600 text-lg hover:border-zinc-400 transition-all"
              >
                +
              </button>
            </div>
            <p className="text-xs text-zinc-400 mt-4">Between 1 and 7 posts per week</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-10">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-5 py-2.5 text-sm text-zinc-500 border border-zinc-200 rounded-xl hover:border-zinc-400 transition-all"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="px-5 py-2.5 text-sm font-medium bg-black text-white rounded-xl hover:bg-zinc-800 transition-all"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium bg-black text-white rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Get started"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}