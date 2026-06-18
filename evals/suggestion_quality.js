const profileId = "c8938c0d-ae4c-46d2-82ed-f4f415c25be3"; 
async function runEval() {
  console.log("Running CreatorOS suggestion quality eval...\n");

  const testProfiles = [
    {
      name: "Fitness creator",
      profileId,
    },
  ];

  for (const testCase of testProfiles) {
    console.log(`Testing: ${testCase.name}`);

    const res = await fetch("http://localhost:3000/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: testCase.profileId, rejectedHooks: [] }),
    });

    const data = await res.json();

    if (data.error) {
      console.log(`❌ API error: ${data.error}\n`);
      continue;
    }

    const suggestions = data.suggestions;

    // Check 1: Returns valid array
    const check1 = Array.isArray(suggestions) && suggestions.length > 0;
    console.log(`${check1 ? "✓" : "❌"} Returns valid array (got ${suggestions?.length ?? 0} items)`);

    // Check 2: All required fields present
    const requiredFields = ["format", "hook", "concept", "suggested_post_date", "why"];
    const check2 = suggestions.every((s) =>
      requiredFields.every((f) => s[f] && s[f].toString().trim() !== "")
    );
    console.log(`${check2 ? "✓" : "❌"} All required fields present`);

    // Check 3: Formats are valid values
    const validFormats = ["reel", "carousel", "story"];
    const check3 = suggestions.every((s) => validFormats.includes(s.format));
    console.log(`${check3 ? "✓" : "❌"} All formats are valid (reel/carousel/story)`);

    // Check 4: Format diversity — at least 2 different formats
    const uniqueFormats = new Set(suggestions.map((s) => s.format));
    const check4 = uniqueFormats.size >= 2;
    console.log(`${check4 ? "✓" : "❌"} Format diversity (${[...uniqueFormats].join(", ")})`);

    // Check 5: Hooks are concise (max 20 words)
    const check5 = suggestions.every((s) => s.hook.split(" ").length <= 20);
    console.log(`${check5 ? "✓" : "❌"} All hooks are concise (≤20 words)`);

    // Check 6: Dates are valid
    const check6 = suggestions.every((s) => !isNaN(new Date(s.suggested_post_date).getTime()));
    console.log(`${check6 ? "✓" : "❌"} All suggested dates are valid`);

    const passed = [check1, check2, check3, check4, check5, check6].filter(Boolean).length;
    console.log(`\nResult: ${passed}/6 checks passed\n`);
  }
}

runEval();