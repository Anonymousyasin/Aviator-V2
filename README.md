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

The app's authentication and admin endpoints are implemented in `server.ts`; a static Vite deployment alone does not provide `/api/*` routes. Run the Node server with `npm start` on a persistent Node host and route the website's `/api/*` requests to that same backend. The current backend stores users, transactions, settings, and sessions in local files and process memory, so it must not be deployed as a stateless serverless function without first migrating that state to a persistent database and shared session store.
