import { describe, it, expect } from 'vitest';
import express from 'express';
import cors from 'cors';
import healthRouter from '../src/routes/health.js';
import reasonRouter from '../src/routes/reason.js';
import { config } from '../src/config.js';

// Setup test express app
const app = express();
app.use(cors());
app.use(express.json());

const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing Authorization header' });
  }
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  if (token !== config.apiKey) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid API key' });
  }
  next();
};

app.use('/api', healthRouter);
app.use('/api', authMiddleware, reasonRouter);

describe('Backend Step 1 API Tests', () => {
  it('GET /api/health should return status ok', async () => {
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const res = await fetch(`http://localhost:${port}/api/health`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ status: 'ok' });

    server.close();
  });

  it('POST /api/reason without auth should return 401', async () => {
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const res = await fetch(`http://localhost:${port}/api/reason`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_task: 'test' })
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('unauthorized');

    server.close();
  });

  it('POST /api/reason with valid auth should return valid StructuredActionResponse', async () => {
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const payload = {
      user_task: 'Log me into this site',
      fields: [
        { ref: 'EMAIL_1', type: 'email', target: 'login_email' },
        { ref: 'PASSWORD_1', type: 'password', target: 'login_password' }
      ],
      button: { text: 'Login', target: 'login_button' }
    };

    const res = await fetch(`http://localhost:${port}/api/reason`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.response_type).toBe('action');
    expect(Array.isArray(data.actions)).toBe(true);
    expect(data.actions.length).toBeGreaterThan(0);
    expect(data.actions[0].action).toBe('TYPE_REFERENCE');
    expect(data.actions[0].target).toBe('login_email');

    server.close();
  });
});
