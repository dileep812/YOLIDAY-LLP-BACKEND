import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {findById} from '../services/userService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.header('authorization') || req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'missing token', details: [] } });
  const token = auth.slice(7);
  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    const user = await findById(payload.userId);
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'invalid token user', details: [] } });
    (req as any).user = { id: user.id, role: user.role };
    next();
  } catch (err: any) {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'invalid token', details: [] } });
  }
}
