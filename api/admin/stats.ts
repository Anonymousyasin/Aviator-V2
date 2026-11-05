import type { VercelRequest, VercelResponse } from '@vercel/node';
export default function stats(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== 'Bearer admin_vercel_master_session') return res.status(401).json({ error: 'Admin Unauthorized' });
  return res.json({ success: true, stats: { totalUsers: 1, activeUsers: 1, totalBalance: 0, pendingDepositsCount: 1, pendingWithdrawalsCount: 1, approvedDepositsVolume: 0, approvedWithdrawalsVolume: 0, totalTransactions: 2 } });
}
