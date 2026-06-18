# Prompt Changelog

## v1.2 — RAG context added
Added retrieval-augmented generation. Before calling Claude, query pgvector for the 5 most similar approved and rejected ideas from the user's history. Inject as positive and negative examples in the prompt.

## v1.1 — Rejection awareness added
Pass rejected hooks from the current session into the prompt so Claude avoids repeating similar concepts within the same session.

## v1.0 — Initial prompt
Base prompt with user profile, available shooting days, and calendar opportunities. Returns 10 ideas as a JSON array.