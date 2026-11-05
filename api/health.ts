import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function health(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    success: true,
    service: 'aviator-api',
    timestamp: new Date().toISOString(),
  });
}
