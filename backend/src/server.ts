import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config.js';
import healthRouter from './routes/health.js';
import reasonRouter from './routes/reason.js';

const app = express();

app.use(cors());
app.use(express.json());

// Security Rule (Section 9): Log timestamps, request IDs, methods, paths, and status codes ONLY.
// NEVER log request or response body contents.
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] [req:${requestId}] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Authentication middleware for /api/reason
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
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

// Mount routes
app.use('/api', healthRouter);
app.use('/api', authMiddleware, reasonRouter);

// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`[Backend Service] Running on http://localhost:${config.port}`);
  });
}

export default app;
