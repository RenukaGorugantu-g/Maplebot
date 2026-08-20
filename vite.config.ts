import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function googleChatProxyPlugin(): Plugin {
  const handler = async (req: any, res: any) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const targetUrl =
            parsed.webhookUrl ||
            'https://chat.googleapis.com/v1/spaces/AAQA8ijHd80/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=vR_WlFMQiHtcfTFfa2B5qfy6y14GpyXdIczanj0q5w0';
          const payload = parsed.payload || parsed;

          const gchatRes = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const data = await gchatRes.text();
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = gchatRes.status;
          res.end(data);
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    } else {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    }
  };

  return {
    name: 'google-chat-proxy',
    configureServer(server) {
      server.middlewares.use('/api/gchat', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/gchat', handler);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), googleChatProxyPlugin()],
});
