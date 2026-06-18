# Database Schema

## user_profiles
Stores the creator's profile captured during onboarding. The core identity record — every other table references this.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| content_type | text[] | Array e.g. ["Lifestyle", "Fitness"] |
| audience | text | Free-text audience description |
| brand_type | text | Content style: Educational / Entertaining / Inspirational / Aesthetic |
| goal | text | e.g. "Grow followers" |
| posts_per_week | integer | Target posting frequency |

---

## calendar_tokens
Stores Google OAuth tokens per user. Kept separate from user_profiles so token refresh logic is isolated and tokens can be rotated without touching profile data.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_profile_id | uuid | FK → user_profiles |
| access_token | text | Expires after 1 hour |
| refresh_token | text | Used to silently refresh access token |
| expires_at | timestamp | Checked before every Calendar API call |

---

## content_suggestions
Every AI-generated and user-created idea. Tracks approval status and which prompt version generated it — essential for measuring prompt quality over time.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_profile_id | uuid | FK → user_profiles |
| format | text | reel / carousel / story |
| hook | text | Opening line or visual hook |
| concept | text | 2–3 sentence description |
| suggested_post_date | date | AI-suggested or user-set post date |
| why | text | Why this fits the creator's goal |
| status | text | pending / approved / rejected |
| user_generated | boolean | True if creator added it manually |
| prompt_version | text | e.g. "v1.0" — links to prompt_versions |

---

## content_calendar
The final output. Stores shoot, edit, and post deadlines calculated from approved suggestions. Kept separate from content_suggestions so the calendar can be regenerated without touching the suggestion record.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| suggestion_id | uuid | FK → content_suggestions |
| user_profile_id | uuid | FK → user_profiles |
| shoot_date | date | Post date minus 5 days |
| edit_date | date | Post date minus 2 days |
| post_date | date | The target publish date |

---

## idea_embeddings
Vector representations of every approved and rejected idea. Powers the RAG layer — used to make future suggestions more personalised by retrieving similar past ideas.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| suggestion_id | uuid | FK → content_suggestions |
| embedding | vector(1536) | Generated via OpenAI text-embedding-3-small |
| status | text | approved / rejected |

---

## prompt_versions
Every version of the Claude prompt, stored like a changelog. Allows tracing which prompt produced which suggestions and measuring how prompt changes affect approval rates.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| version_number | text | e.g. "v1.0", "v1.1" |
| prompt_text | text | Full prompt text |
| created_at | timestamp | When this version was deployed |
| notes | text | What changed and why |