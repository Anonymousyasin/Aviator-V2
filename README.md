<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a5299fe0-2f9f-4515-af96-2aec3b368f33

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## API Backend Deployment

The app's authentication and admin endpoints are implemented in `server.ts`. The Express app is exported and mounted by `api/[...path].ts`, so Vercel serves the frontend and `/api/*` endpoints from the same project. `npm run dev` and `npm start` still run the complete local Vite + Express server.

For production financial data, use a persistent Node host or migrate the JSON files and in-memory sessions to a managed database/session store. Vercel function instances have ephemeral filesystems and can be recycled; the serverless route is intended to make the dashboard operational and testable, not to replace durable financial storage.

The API health check is available at `/api/health`.

## Telegram signals

Telegram delivery no longer uses a configured `VITE_TELEGRAM_CHAT_ID`. Set only `VITE_TELEGRAM_BOT_TOKEN` in the deployment environment. A user must open the bot and press `/start` once; the game discovers all chats that have interacted with the bot and broadcasts future signals to every subscriber.
