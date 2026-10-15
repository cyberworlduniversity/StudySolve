# StudySolve AI Automation

StudySolve is designed so the AI is the primary academic content engine. Students can submit questions, doubts, assignments, answer-checking requests, programming problems, exam preparation requests, and study-material transformation requests without requiring an administrator to maintain a question-and-answer bank.

## AI architecture

Browser → authenticated Supabase Edge Function → server-side AI provider → personalized response → Supabase learning history.

The browser only contains the Supabase publishable key. AI provider secrets stay in Edge Function secrets.

## Universal AI endpoint

`ai-study` is the central Edge Function. It dynamically handles:

- explanations and conceptual doubts
- step-by-step problem solving
- answer checking
- exam preparation
- exam-tomorrow revision
- programming help
- assignment guidance
- practice-question generation
- re-teaching when a learner is confused

The endpoint does not depend on the `questions` table for the Solve experience.

## Server configuration

Set these as Supabase Edge Function Secrets:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Never put either value in `index.html`, JavaScript, GitHub, or a mobile application.

The frontend calls the authenticated `ai-study` Edge Function using the signed-in student's session.
