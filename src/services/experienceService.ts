import pool from '../db.js';

export interface ExperienceRecord {
  id: number;
  title: string;
  description: string;
  location: string | null;
  price: number;
  start_time: string | null;
  created_by: number;
  status: 'draft'|'published'|'blocked';
  created_at: string;
}

export async function createExperience(data: {
  title: string;
  description: string;
  location?: string | null;
  price?: number;
  start_time?: string | null;
  created_by: number;
}) {
  const r = await pool.query(
    `INSERT INTO experiences (title, description, location, price, start_time, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.title, data.description, data.location ?? null, data.price ?? 0, data.start_time ?? null, data.created_by]
  );
  return r.rows[0] as ExperienceRecord;
}

export async function findById(id: number) {
  const r = await pool.query('SELECT * FROM experiences WHERE id=$1', [id]);
  return r.rows[0] as ExperienceRecord | null;
}

export async function updateStatus(id: number, status: 'draft'|'published'|'blocked') {
  const r = await pool.query('UPDATE experiences SET status=$1 WHERE id=$2 RETURNING *', [status, id]);
  return r.rows[0] as ExperienceRecord | null;
}

export type ListOptions = {
  location?: string;
  from?: string; // ISO date
  to?: string; // ISO date
  page?: number;
  limit?: number;
  sort?: 'asc'|'desc';
};

export async function listPublished(opts: ListOptions) {
  const vals: any[] = [];
  const where: string[] = ["status = 'published'"];

  if (opts.location) {
    vals.push(`%${opts.location}%`);
    where.push(`location ILIKE $${vals.length}`);
  }
  if (opts.from) {
    vals.push(opts.from);
    where.push(`start_time >= $${vals.length}`);
  }
  if (opts.to) {
    vals.push(opts.to);
    where.push(`start_time <= $${vals.length}`);
  }

  const sort = opts.sort === 'desc' ? 'DESC' : 'ASC';
  const limit = Math.max(1, Math.min(opts.limit ?? 10, 100));
  const page = Math.max(1, opts.page ?? 1);
  const offset = (page - 1) * limit;

  const sql = `
    SELECT id, title, description, location, price, start_time, created_by, status, created_at,
           COUNT(*) OVER() AS total_count
    FROM experiences
    WHERE ${where.join(' AND ')}
    ORDER BY start_time ${sort}
    LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}
  `;

  vals.push(limit, offset);
  const r = await pool.query(sql, vals);
  const rows = r.rows as (ExperienceRecord & { total_count: number })[];
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  // remove total_count from each row if desired
  const data = rows.map(({ total_count, ...rest }) => rest as ExperienceRecord);
  return { data, total, page, limit };
}
