import app from '../src/app.js';

// Minimal DB-independent ping for Vercel debugging
app.get('/api/v1/ping', (req, res) => res.status(200).json({ status: 'pong' }));

export default app;
