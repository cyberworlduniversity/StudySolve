# StudySolve

**Stuck on a topic? Solve it. Understand it. Master it.**

StudySolve is a mobile-first learning website built with plain **HTML, CSS and JavaScript** on the frontend and **Supabase** for authentication, PostgreSQL data, private file storage and AI Teacher Edge Functions.

## Stack

- Frontend: HTML5 + CSS3 + JavaScript (no frontend framework required)
- Auth: Supabase Auth
- Database: Supabase PostgreSQL with Row Level Security
- Storage: Supabase private `study-materials` bucket
- AI Teacher: Supabase Edge Function `ai-teacher`
- Source control: GitHub
- Optional future services: Java or Python can be added for specialized backend workloads; browser code must never contain private service credentials.

## Current working features

- Responsive student dashboard
- Sign up, sign in, sign out and password-reset email flow
- Profile and preferred language
- AI Teacher problem-solving flow
- Real Supabase study sessions, problems and AI teacher messages
- Private study-material upload and deletion
- Progress/mastery dashboard from real database records
- Practice view using saved problems
- Study planner and local focus timer
- Light/dark theme
- Mobile navigation
- RLS-compatible client-side data access

## Supabase configuration

The website uses the StudySolve Supabase project and a publishable client key. Publishable/anon keys are designed for browser use; database security must remain enforced through Supabase RLS. Never place a Supabase service-role key, AI provider key, database password or other private secret in this repository.

## AI Teacher provider

The `ai-teacher` Edge Function is already configured to require JWT authentication. Its provider secret must remain a server-side Supabase Edge Function secret. If the provider secret is missing, the website displays a truthful backend-configuration message instead of pretending that AI is working.

## Run locally

Because this is a static HTML/CSS/JS site, it can be served with any static server. For example:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500`.

Do not open the HTML file directly if your browser blocks module/CDN/network requests; use a local HTTP server.

## Security model

The frontend never receives database service credentials. Student data is queried with the signed-in user's session and protected by Row Level Security. Uploaded material is stored under `<user-id>/...` paths in the private storage bucket.

## Roadmap

1. Materials → AI transformations (notes, exam answers, quizzes, flashcards)
2. Adaptive quizzes and mistake notebook
3. Spaced revision and mastery engine
4. Programming Lab with an isolated code-execution service
5. Calendar/planner persistence in PostgreSQL
6. Teacher/admin portal with server-side authorization
7. Accessibility, testing, performance and production hardening
8. Optional Java/Python specialized services where they provide a real backend capability
