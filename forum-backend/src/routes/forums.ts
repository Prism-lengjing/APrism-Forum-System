import { type NextFunction, type Request, type Response, Router } from 'express';
import { body, param, query } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { forumService } from '../services/forumService';
import { moderationService } from '../services/moderationService';
import type { AuthUser } from '../types/models';
import { sendSuccess } from '../utils/apiResponse';
import { HttpError } from '../utils/httpError';

const router = Router();

function getCurrentUser(req: Request): AuthUser {
  const user = (req as Request & { user?: AuthUser }).user;
  if (!user) {
    throw new HttpError(401, 'Unauthorized');
  }
  return user;
}

function requireAdmin(user: AuthUser): void {
  if (user.role !== 'admin') {
    throw new HttpError(403, 'Forbidden');
  }
}

function requireAdminOrForumModerator(forumId: number, user: AuthUser): void {
  if (user.role === 'admin') {
    return;
  }
  if (!moderationService.isModerator(forumId, user.id)) {
    throw new HttpError(403, 'Forbidden');
  }
}

router.get('/categories', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = forumService.getCategories();
    return sendSuccess(res, categories, 'Categories loaded');
  } catch (error) {
    return next(error);
  }
});

router.get('/forums', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const forums = forumService.getForums();
    return sendSuccess(res, forums, 'Forums loaded');
  } catch (error) {
    return next(error);
  }
});

router.get(
  '/forums/:id',
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const forumId = Number(req.params.id);
      const forum = forumService.getForumById(forumId);
      return sendSuccess(res, forum, 'Forum loaded');
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  '/forums/:id/threads',
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const forumId = Number(req.params.id);
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      const result = forumService.getForumThreads(forumId, page, pageSize);
      return sendSuccess(res, result, 'Forum threads loaded');
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  '/forums/:id/moderators',
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const forumId = Number(req.params.id);
      const moderators = moderationService.listForumModerators(forumId);
      return sendSuccess(res, moderators, 'Forum moderators loaded');
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  '/forums/:id/moderator-logs',
  requireAuth,
  [
    param('id').isInt({ min: 1 }),
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      const forumId = Number(req.params.id);
      requireAdminOrForumModerator(forumId, user);

      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      const logs = moderationService.listActionLogs(forumId, page, pageSize);
      return sendSuccess(res, logs, 'Forum moderator logs loaded');
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/forums/:id/moderators',
  requireAuth,
  [param('id').isInt({ min: 1 }), body('userId').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      requireAdmin(user);

      const forumId = Number(req.params.id);
      const targetUserId = Number(req.body.userId);
      const moderator = moderationService.assignModerator(forumId, targetUserId, user.id);
      return sendSuccess(res, moderator, 'Moderator assigned', 201);
    } catch (error) {
      return next(error);
    }
  }
);

router.delete(
  '/forums/:id/moderators/:userId',
  requireAuth,
  [param('id').isInt({ min: 1 }), param('userId').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      requireAdmin(user);

      const forumId = Number(req.params.id);
      const targetUserId = Number(req.params.userId);
      const result = moderationService.removeModerator(forumId, targetUserId);
      return sendSuccess(res, result, 'Moderator removed');
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
