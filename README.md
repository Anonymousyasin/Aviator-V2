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

## Telegram signals

The bot token is used only by the server; do not use a `VITE_`-prefixed token, since Vite would expose it in the public browser bundle. Configure these server-side environment variables:

- `TELEGRAM_BOT_TOKEN`: token from BotFather.
- `TELEGRAM_WEBHOOK_SECRET`: a random secret containing 1–256 characters from Telegram's supported set (`A-Z`, `a-z`, `0-9`, `_`, `-`).
- `FIREBASE_SERVICE_ACCOUNT_JSON`: service-account JSON with Firestore access. Set this for Vercel or any multi-instance/serverless deployment so every function instance shares the subscriber list. Without it, local development uses `data/telegram-subscribers.json`, which is not durable on Vercel.

Use a Firebase service account with the minimum Firestore permissions required for the project's Firestore database. Store the complete service-account JSON as a protected server environment value, never in the repository or a `VITE_` variable.

After deploying the app over HTTPS, register the webhook once (replace the URL and use the same secret configured above):

```sh
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://YOUR_DOMAIN/api/telegram/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}" \
  -d 'allowed_updates=["message"]'
```

Each person must open the bot and send `/start` once to opt in. The server records private-chat subscribers in the shared Firestore collection and sends signals to all active subscribers. Users can send `/stop` to unsubscribe and `/start` to opt in again. The browser no longer polls Telegram or stores a partial subscriber list in `localStorage`.
