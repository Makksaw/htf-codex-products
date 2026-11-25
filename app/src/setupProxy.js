const { createProxyMiddleware } = require('http-proxy-middleware');

function hasKey() {
  return Boolean(String(process.env.REACT_APP_GROK_API_KEY || '').trim());
}

// CRA loads REACT_APP_GROK_API_KEY into this process. The browser never sees it.
module.exports = function setupProxy(app) {
  app.get('/api/assistant', (req, res) => {
    res.json({ ready: hasKey() });
  });

  app.use(
    '/api/grok',
    (req, res, next) => {
      if (hasKey()) {
        next();
        return;
      }
      res.status(503).json({ error: 'Create app/.env and set REACT_APP_GROK_API_KEY.' });
    },
    createProxyMiddleware({
      target: 'https://api.x.ai',
      changeOrigin: true,
      secure: true,
      logLevel: 'silent',
      onProxyReq(proxyReq) {
        proxyReq.path = '/v1/chat/completions';
        const key = process.env.REACT_APP_GROK_API_KEY;
        if (key) proxyReq.setHeader('Authorization', `Bearer ${key}`);
      },
    }),
  );
};
