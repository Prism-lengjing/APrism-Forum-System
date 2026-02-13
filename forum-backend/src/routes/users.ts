import { type NextFunction, type Request, type Response, Router } from 'express';
import { body, param } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { userService } from '../services/userService';
import type { AuthUser } from '../types/models';
import { sendSuccess } from '../utils/apiResponse';
import { HttpError } from '../utils/httpError';

const router = Router();

router.get(
  '/users/:id',
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Number(req.params.id);
      const profile = userService.getPublicProfile(userId);
      return sendSuccess(res, profile, '获取用户资料成功');
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
      const user = (req as Request & { user?: AuthUser }).user;
      if (!user) {
        throw new HttpError(401, '未登录');
      }
      const profile = userService.updateCurrentUser(user.id, req.body);
      return sendSuccess(res, profile, '更新用户资料成功');
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
