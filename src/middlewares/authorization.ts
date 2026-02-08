import { Request, Response, NextFunction } from 'express';
import {findById} from '../services/experienceService.js';

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'authentication required', details: [] } });
    if (!roles.includes(user.role)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'must be owner or admin', details: [] } });
    next();
  };
}

export async function requireOwnerOrAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'authentication required', details: [] } });
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'invalid id', details: [] } });
  try {
    const exp = await findById(id);
    if (!exp) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'experience not found', details: [] } });
    if (exp.created_by !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'must be owner or admin', details: [] } });
    }
    (req as any).experience = exp;
    next();
  } catch (err: any) {
    next(err);
  }
}
