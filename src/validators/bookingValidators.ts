export function validateBookingBody(body: any) {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') {
    errors.push('body must be an object');
    return { ok: false, errors };
  }
  const { seats } = body;
  if (seats === undefined) errors.push('seats is required');
  const n = Number(seats);
  if (!Number.isInteger(n) || n < 1) errors.push('seats must be an integer >= 1');
  return { ok: errors.length === 0, errors };
}
