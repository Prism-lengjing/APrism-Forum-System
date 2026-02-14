import { type NextFunction, type Request, type Response, Router } from 'express';
import { param } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { badgeService } from '../services/badgeService';
import type { AuthUser } from '../types/models';
import { sendSuccess } from '../utils/apiResponse';
import { HttpError } from '../utils/httpError';

const router = Router();

function getCurrentUser(req: Request): AuthUser {
  const user = (req as Request & { user?: AuthUser }).user;
  if (!user) {
    throw new HttpError(401, '未登录');
  }
  return user;
}

router.get('/badges', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const badges = badgeService.getAllBadges();
    return sendSuccess(res, badges, '获取徽章列表成功');
  } catch (error) {
    return next(error);
  }
});

router.get('/badges/me', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = getCurrentUser(req);
    const badges = badgeService.getUserBadges(user.id);
    return sendSuccess(res, badges, '获取我的徽章成功');
  } catch (error) {
    return next(error);
  }
});

router.get(
  '/users/:id/badges',
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(req.params.id);
      const badges = badgeService.getUserBadges(userId);
      return sendSuccess(res, badges, '获取用户徽章成功');
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
