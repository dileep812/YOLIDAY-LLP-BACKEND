import { Request, Response } from 'express';
import {createUser,findByEmail} from '../services/userService.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export async function signup(req: Request, res: Response) {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) 
        return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'email,password,role required', details: [] } });
  // By default only allow 'user' or 'host' at signup. Admin cannot be self-assigned
    // Admin bootstrap: email-only mode. If ADMIN_EMAIL is set in .env,
    // any signup using that email will be given the admin role.
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const isAdminBootstrap = !!(ADMIN_EMAIL && email === ADMIN_EMAIL);

    if (role === 'admin' && !isAdminBootstrap) {
      return res.status(400).json({ error: { code: 'INVALID_ROLE', message: 'role must be user or host', details: [] } });
    }
    if (!['user', 'host', 'admin'].includes(role)) {
      return res.status(400).json({ error: { code: 'INVALID_ROLE', message: 'role must be user or host', details: [] } });
    }

    const existing = await findByEmail(email);
    if (existing) 
        return res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'email already registered', details: [] } });

    // Determine final role: admin only if bootstrap credentials match
    let finalRole: 'admin'|'host'|'user' = role as any;
    if (isAdminBootstrap) finalRole = 'admin';

    const hash = await bcrypt.hash(password, 10);
    const user = await createUser(email, hash, finalRole);

    // Per spec: do NOT return a JWT on signup. Return created user info only.
    return res.status(201).json({ user: { id: user.id, role: user.role } });
  } catch (err: any) {
    console.error(err);
    const code = err?.code || 'INTERNAL_ERROR';
    const message = err?.message || 'Internal Server Error';
    const details = Array.isArray(err?.details) ? err.details : [err?.message].filter(Boolean);
    return res.status(err?.status || 500).json({ error: { code, message, details } });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'email,password required', details: [] } });
    const user = await findByEmail(email);
    if (!user) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'invalid email or password', details: [] } });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'invalid email or password', details: [] } });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, role: user.role } });
  } catch (err: any) {
    console.error(err);
    const code = err?.code || 'INTERNAL_ERROR';
    const message = err?.message || 'Internal Server Error';
    const details = Array.isArray(err?.details) ? err.details : [err?.message].filter(Boolean);
    return res.status(err?.status || 500).json({ error: { code, message, details } });
  }
}
