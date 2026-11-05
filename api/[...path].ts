import { app } from '../server';

// Vercel's catch-all Node function forwards /api/* requests to the same
// Express router used by the local development server.
export default app;
