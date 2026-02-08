import pool from '../db.js';

export interface UserRecord {
  id: number;
  email: string;
  password_hash: string;
  role: 'admin'|'host'|'user';
  created_at: string;
}

export async function findByEmail(email: string): Promise<UserRecord | null> {
  const r = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
  return r.rows[0] ?? null;
}

export async function findById(id: number): Promise<UserRecord | null> {
  const r = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
  return r.rows[0] ?? null;
}

export async function createUser(email: string, passwordHash: string, role: 'admin'|'host'|'user') {
  const r = await pool.query(
    'INSERT INTO users (email, password_hash, role) VALUES ($1,$2,$3) RETURNING id,email,role,created_at',
    [email, passwordHash, role]
  );
  return r.rows[0];
}
