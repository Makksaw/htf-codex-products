const { createProxyMiddleware } = require('http-proxy-middleware');

// CRA loads REACT_APP_GROK_API_KEY into this process. The browser never sees it.
module.exports = function setupProxy(app) {
  app.use(
    '/api/grok',
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
