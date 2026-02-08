import pool from '../db.js';

export interface BookingRecord {
  id: number;
  experience_id: number;
  user_id: number;
  seats: number;
  status: 'confirmed'|'cancelled';
  created_at: string;
}

export async function findConfirmedBooking(experienceId: number, userId: number) {
  const r = await pool.query(
    'SELECT * FROM bookings WHERE experience_id=$1 AND user_id=$2 AND status=$3',
    [experienceId, userId, 'confirmed']
  );
  return r.rows[0] as BookingRecord | null;
}

export async function createBooking(experienceId: number, userId: number, seats: number) {
  const r = await pool.query(
    'INSERT INTO bookings (experience_id, user_id, seats) VALUES ($1,$2,$3) RETURNING *',
    [experienceId, userId, seats]
  );
  return r.rows[0] as BookingRecord;
}
