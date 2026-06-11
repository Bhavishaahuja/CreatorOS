# Database Schema

## user_profiles
Stores the creator's profile captured during onboarding — their content type, audience, goal, and posting frequency. Every other table references this. It is the foundation that personalises all AI suggestions.

## calendar_tokens
Stores the Google OAuth access and refresh tokens after the user connects their calendar. Kept separate from user_profiles for security — token data should be isolated from profile data.

## content_suggestions
Stores every AI-generated and user-created content idea. Tracks whether it was approved or rejected, which prompt version generated it, and whether the user added it manually. This is the core table the entire product is built around.

## content_calendar
Stores the final shoot, edit, and post dates for every approved idea. Generated from content_suggestions after the user completes the approval flow.

## idea_embeddings
Stores vector representations of each content idea using pgvector. Used by the RAG pipeline to retrieve similar approved and rejected ideas when generating new suggestions, making recommendations more personalised over time.

## prompt_versions
Tracks every version of the AI prompt used to generate suggestions. Links to content_suggestions via prompt_version field so you can trace which prompt produced which output and measure quality changes across versions.