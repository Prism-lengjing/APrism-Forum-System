import { type NextFunction, type Request, type Response, Router } from 'express';
import { body, param } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { userService } from '../services/userService';
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

router.get(
  '/users/:id',
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(req.params.id);
      const profile = userService.getPublicProfile(userId);
      return sendSuccess(res, profile, 'User profile loaded');
    } catch (error) {
      return next(error);
    }
  }
);

router.put(
  '/users/me',
  requireAuth,
  [
    body('avatar').optional().isString().trim().isLength({ min: 3, max: 500 }),
    body('bio').optional().isString().trim().isLength({ min: 0, max: 500 }),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      const profile = userService.updateCurrentUser(user.id, req.body);
      return sendSuccess(res, profile, 'Profile updated');
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  '/users/:id/follow-status',
  requireAuth,
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      const targetUserId = Number(req.params.id);
      const result = userService.getFollowStatus(user.id, targetUserId);
      return sendSuccess(res, result, 'Follow status loaded');
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/users/:id/follow',
  requireAuth,
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      const targetUserId = Number(req.params.id);
      const result = userService.followUser(user.id, targetUserId);
      return sendSuccess(res, result, 'Followed user');
    } catch (error) {
      return next(error);
    }
  }
);

router.delete(
  '/users/:id/follow',
  requireAuth,
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      const targetUserId = Number(req.params.id);
      const result = userService.unfollowUser(user.id, targetUserId);
      return sendSuccess(res, result, 'Unfollowed user');
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
