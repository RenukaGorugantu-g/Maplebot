import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { webhookUrl, payload } = req.body || {};

    const targetUrl =
      webhookUrl ||
      'https://chat.googleapis.com/v1/spaces/AAQA8ijHd80/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=vR_WlFMQiHtcfTFfa2B5qfy6y14GpyXdIczanj0q5w0';

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || req.body),
    });

    const data = await response.json().catch(() => ({}));
    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error('Google Chat Proxy Error:', error);
    return res.status(500).json({ error: error.message || 'Internal proxy error' });
  }
}
