import { type NextFunction, type Request, type Response, Router } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { authService } from '../services/authService';
import type { AuthUser } from '../types/models';
import { sendSuccess } from '../utils/apiResponse';
import { HttpError } from '../utils/httpError';

const router = Router();

router.post(
  '/register',
  [
    body('username').isString().trim().isLength({ min: 3, max: 50 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 6, max: 64 }),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = authService.register(req.body);
      return sendSuccess(res, result, '注册成功', 201);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/login',
  [
    body('identifier').isString().trim().isLength({ min: 3, max: 255 }),
    body('password').isString().isLength({ min: 6, max: 64 }),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = authService.login(req.body);
      return sendSuccess(res, result, '登录成功');
    } catch (error) {
      return next(error);
    }
  }
);

router.get('/me', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user) {
      throw new HttpError(401, '未登录');
    }
    const userId = user.id;
    const result = authService.getCurrentUser(userId);
    return sendSuccess(res, result, '获取当前用户成功');
  } catch (error) {
    return next(error);
  }
});

export default router;
