import type { VercelRequest, VercelResponse } from '@vercel/node';
export default function transactions(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== 'Bearer admin_vercel_master_session') return res.status(401).json({ error: 'Admin Unauthorized' });
  const now = new Date().toISOString();
  return res.json({ success: true, transactions: [
    { id: 'DEP-982142', userId: 'user_demo_1001', userEmail: 'player@aviator.bd', userName: 'Shakib Gamer', type: 'Deposit', method: 'Nagad', phone: '01712345678', amount: 1500, trxId: '9G7K2LMN8P', status: 'Pending', createdAt: now },
    { id: 'WD-541290', userId: 'user_demo_1001', userEmail: 'player@aviator.bd', userName: 'Shakib Gamer', type: 'Withdraw', method: 'Nagad', phone: '01712345678', amount: 1000, status: 'Pending', createdAt: now },
  ] });
}
