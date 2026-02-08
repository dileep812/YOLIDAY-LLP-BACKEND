import 'dotenv/config';
import express, { Request, Response} from 'express';
import morgan from 'morgan';
import pool from './db.js';

const app = express();
app.use(express.json());
// Structured JSON request logging via morgan
app.use(morgan((tokens: any, req: Request, res: Response) => {
  const obj = {
    time: new Date().toISOString(),
    method: tokens.method(req, res),
    path: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    latency_ms: Number(tokens['response-time'](req, res)) || 0,
  };
  return JSON.stringify(obj);
}, { stream: { write: (s: string) => console.log(s.trim()) } }));

// Demo route that returns a controlled error JSON shape
import authRouter from './routes/auth.js'
import experiencesRouter from './routes/experiences.js'


app.use('/auth', authRouter);
app.use('/experiences', experiencesRouter);

// Health check: verifies DB connectivity
app.get('/health', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', db: 'ok' });
  } catch (err: any) {
    console.error('Health check failed', err?.message || err);
    return res.status(503).json({ status: 'error', db: 'unreachable', error: err?.message || String(err) });
  }
});


const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
