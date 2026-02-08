import { Router } from 'express';
import { createExperience, publishExperience, blockExperience, bookExperience, listExperiences } from '../controllers/experienceController.js';
import { requireRole, requireOwnerOrAdmin } from '../middlewares/authorization.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

// List published experiences (public)
router.get('/', listExperiences);

// Create experience - only host or admin
router.post('/', requireAuth, requireRole('host', 'admin'), createExperience);

// Book an experience - users, hosts and admins allowed; owners cannot book their own
router.post('/:id/book', requireAuth, requireRole('user', 'host', 'admin'), bookExperience);

// Publish - owner (host) or admin
router.patch('/:id/publish', requireAuth, requireOwnerOrAdmin, publishExperience);

// Block - admin only
router.patch('/:id/block', requireAuth, requireRole('admin'), blockExperience);

export default router;
