import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSession } from '../adminStore';

export default function login(req: VercelRequest, res: VercelResponse) {
  let input: Record<string, any> = {};
  if (req.body && typeof req.body === 'object') input = req.body as Record<string, any>;
  else if (typeof req.body === 'string') {
    try { input = JSON.parse(req.body); } catch { input = {}; }
  }
  if (input.username !== 'admin' || input.password !== 'admin12345') return res.status(401).json({ error: 'Invalid admin credentials.' });
  return res.status(200).json({ success: true, message: 'Admin authenticated successfully.', token: createSession(), admin: { username: 'admin' } });
}
