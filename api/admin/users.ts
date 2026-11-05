import type { VercelRequest, VercelResponse } from '@vercel/node';
export default function users(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== 'Bearer admin_vercel_master_session') return res.status(401).json({ error: 'Admin Unauthorized' });
  return res.json({ success: true, users: [{ id: 'user_demo_1001', email: 'player@aviator.bd', name: 'Shakib Gamer', balance: 0, vipPoints: 350, status: 'active', createdAt: new Date().toISOString(), transactionsCount: 2 }] });
}
