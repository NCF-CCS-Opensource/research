# Show only authored or translated failure messages

Failure text shown to people is decided at the shared transport boundary. PostgreSQL messages pass through only for project-authored codes `P0001` and `42501`; known structural codes are translated, and all other platform text uses a generic fallback.

The original platform error remains available as the domain error's cause for debugging. R2 Edge Function response bodies are project-authored and pass through from failed response contexts. UI code must never render raw database or platform messages directly.
