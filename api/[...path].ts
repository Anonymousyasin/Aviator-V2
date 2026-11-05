import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../server';

export default function api(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
