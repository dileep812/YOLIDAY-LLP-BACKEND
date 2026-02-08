export function validateCreateExperience(body: any) {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') {
    errors.push('body must be an object');
    return { ok: false, errors };
  }
  const { title, description, location, price, start_time } = body;
  if (!title || typeof title !== 'string' || title.trim().length === 0) errors.push('title is required');
  if (!description || typeof description !== 'string' || description.trim().length === 0) errors.push('description is required');
  if (location !== undefined && typeof location !== 'string') errors.push('location must be a string');
  if (price !== undefined && typeof price !== 'number') errors.push('price must be a number');
  if (start_time !== undefined && isNaN(Date.parse(String(start_time)))) errors.push('start_time must be a valid date');
  return { ok: errors.length === 0, errors };
}
