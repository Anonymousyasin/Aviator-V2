<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run the app locally.

View the app in AI Studio: https://ai.studio/apps/a5299fe0-2f9f-4515-af96-2aec3b368f33

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key.
3. Run the app: `npm run dev`

## API Backend Deployment

The app's authentication and admin endpoints are implemented in `server.ts`. The Express app is exported and mounted by `api/[...path].ts`, so Vercel serves the frontend and `/api/*` endpoints from the same project. `npm run dev` and `npm start` run the complete local Vite + Express server.

For production financial data, use a persistent Node host or migrate the JSON files and in-memory sessions to a managed database/session store. Vercel function instances have ephemeral filesystems and can be recycled; the serverless route is intended to make the dashboard operational and testable, not to replace durable financial storage.

The API health check is available at `/api/health`.

## Live signals

Open the **Signals** tab or visit `/#signal`. New simulated values from the Aviator game appear immediately and are saved in this browser only using local storage. The page does not use Firestore, a Telegram bot, or any additional credentials. Signals do not sync to other browsers or devices; clearing this site's browser storage clears the saved signal history. These simulated values are not guaranteed predictions or real-money game outcomes.
