# Agent notes

## Cursor Cloud specific instructions

### Deploy / Vercel

- **Do not** trigger, poll, wait on, or “force” Vercel deploys (no empty commits for redeploy, no deploy status checks, no production URL smoke waits for Vercel).
- The repo owner deploys Vercel **manually**.
- After code fixes, **push to `master` on GitHub** and stop there unless asked otherwise.
