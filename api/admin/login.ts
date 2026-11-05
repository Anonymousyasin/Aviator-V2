import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function login(req: VercelRequest, res: VercelResponse) {
  const input = req.body && typeof req.body === 'object'
    ? req.body as Record<string, unknown>
    : {};

  if (input.username !== 'admin' || input.password !== 'admin12345') {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  // Stateless token keeps login working across Vercel function instances.
  return res.status(200).json({
    success: true,
    message: 'Admin authenticated successfully.',
    token: 'admin_vercel_master_session',
    admin: { username: 'admin' },
  });
}
