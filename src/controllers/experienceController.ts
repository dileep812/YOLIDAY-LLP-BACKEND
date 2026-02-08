import { Request, Response } from 'express';
import * as experienceService from '../services/experienceService.js';
import { validateCreateExperience } from '../validators/experienceValidators.js';
import { validateBookingBody } from '../validators/bookingValidators.js';

export async function listExperiences(req: Request, res: Response) {
  try {
    const { location, from, to, page, limit, sort } = req.query;
    const pageN = page ? Number(page) : 1;
    const limitN = limit ? Number(limit) : 10;
    const sortOpt = (typeof sort === 'string' && sort.toLowerCase() === 'desc') ? 'desc' : 'asc';

    const result = await experienceService.listPublished({
      location: typeof location === 'string' ? location : undefined,
      from: typeof from === 'string' ? from : undefined,
      to: typeof to === 'string' ? to : undefined,
      page: pageN,
      limit: limitN,
      sort: sortOpt as 'asc' | 'desc',
    });

    return res.json({ data: result.data, meta: { total: result.total, page: result.page, limit: result.limit } });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err?.message || 'Internal Server Error', details: [] } });
  }
}

export async function createExperience(req: Request, res: Response) {
  try {
    const { title, description, location, price, start_time } = req.body;
    const v = validateCreateExperience(req.body);
    if (!v.ok) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'validation failed', details: v.errors } });
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'authentication required', details: [] } });
    const exp = await experienceService.createExperience({
      title,
      description,
      location: location ?? null,
      price: price ?? 0,
      start_time: start_time ?? null,
      created_by: user.id,
    });
    return res.status(201).json({ experience: exp });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err?.message || 'Internal Server Error', details: [] } });
  }
}

export async function publishExperience(req: Request, res: Response) {
  try {
    // requireOwnerOrAdmin middleware ensures authentication and ownership/admin
    const exp = (req as any).experience;
    const id = exp?.id ?? Number(req.params.id);
    if (!id) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'invalid id', details: [] } });
    const updated = await experienceService.updateStatus(id, 'published');
    if (!updated) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'experience not found', details: [] } });
    return res.json({ experience: updated });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err?.message || 'Internal Server Error', details: [] } });
  }
}

export async function blockExperience(req: Request, res: Response) {
  try {
    // requireRole('admin') enforces admin only
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'invalid id', details: [] } });
    const updated = await experienceService.updateStatus(id, 'blocked');
    if (!updated) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'experience not found', details: [] } });
    return res.json({ experience: updated });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err?.message || 'Internal Server Error', details: [] } });
  }
}

export async function bookExperience(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'authentication required', details: [] } });
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'invalid id', details: [] } });
    const vb = validateBookingBody(req.body);
    if (!vb.ok) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'validation failed', details: vb.errors } });
    const { seats } = req.body as { seats?: number };
    const s = Number(seats ?? 0);

    const exp = await experienceService.findById(id);
    if (!exp) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'experience not found', details: [] } });
    if (exp.status !== 'published') return res.status(400).json({ error: { code: 'INVALID_STATE', message: 'cannot book unpublished experience', details: [] } });
    // Hosts cannot book their own experiences
    if (user.role === 'host' && exp.created_by === user.id) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'hosts cannot book their own experiences', details: [] } });

    // prevent duplicate confirmed booking
    const { findConfirmedBooking, createBooking } = await import('../services/bookingService.js');
    const existing = await findConfirmedBooking(id, user.id);
    if (existing) return res.status(409).json({ error: { code: 'ALREADY_BOOKED', message: 'already have a confirmed booking for this experience', details: [] } });

    const booking = await createBooking(id, user.id, s);
    return res.status(201).json({ booking });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err?.message || 'Internal Server Error', details: [] } });
  }
}
