import { type NextFunction, type Request, type Response, Router } from 'express';
import { query } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { pointsService } from '../services/pointsService';
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

router.get('/points/me/summary', requireAuth, (req, res, next) => {
  try {
    const user = getCurrentUser(req);
    const summary = pointsService.getSummary(user.id);
    return sendSuccess(res, summary, '获取积分概览成功');
  } catch (error) {
    return next(error);
  }
});

router.get(
  '/points/me/logs',
  requireAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      const logs = pointsService.getPointLogs(user.id, page, pageSize);
      return sendSuccess(res, logs, '获取积分记录成功');
    } catch (error) {
      return next(error);
    }
  }
);

router.post('/points/me/signin', requireAuth, (req, res, next) => {
  try {
    const user = getCurrentUser(req);
    const result = pointsService.dailySignin(user.id);
    return sendSuccess(res, result, '签到成功');
  } catch (error) {
    return next(error);
  }
});

export default router;
