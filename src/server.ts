import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';

const app = express();
app.use(express.json());

// Demo route that returns a controlled error JSON shape
import authRouter from './routes/auth.js'
import experiencesRouter from './routes/experiences.js'

app.get('/error-test', (req: Request, res: Response) => {
  res.status(400).json({ error: { code: 'TEST_ERROR', message: 'This is a test error', details: [] } });
});

app.use('/auth', authRouter);
app.use('/experiences', experiencesRouter);

app.get('/', (req: Request, res: Response) => res.json({ ok: true }));

// Global error handler — ensures consistent error response shape
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);
  const status = err?.status || 500;
  const code = err?.code || (status === 500 ? 'INTERNAL_ERROR' : 'ERROR');
  const message = err?.message || 'Internal Server Error';
  const details = Array.isArray(err?.details) ? err.details : [];
  res.status(status).json({ error: { code, message, details } });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
