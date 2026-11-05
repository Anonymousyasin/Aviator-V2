import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminLoginHandler } from '../../server';

export default function login(req: VercelRequest, res: VercelResponse) {
  if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      req.body = {};
    }
  }

  return adminLoginHandler(req as never, res as never);
}
