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
    throw new HttpError(401, 'Unauthorized');
  }
  return user;
}

router.get('/points/me/summary', requireAuth, (req, res, next) => {
  try {
    const user = getCurrentUser(req);
    const summary = pointsService.getSummary(user.id);
    return sendSuccess(res, summary, 'Points summary loaded');
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
      return sendSuccess(res, logs, 'Points logs loaded');
    } catch (error) {
      return next(error);
    }
  }
);

router.post('/points/me/signin', requireAuth, (req, res, next) => {
  try {
    const user = getCurrentUser(req);
    const result = pointsService.dailySignin(user.id);
    return sendSuccess(res, result, 'Signed in');
  } catch (error) {
    return next(error);
  }
});

router.get(
  '/points/leaderboard',
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    query('period').optional().isIn(['all', '7d', '30d']),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      const period = typeof req.query.period === 'string' ? req.query.period : 'all';
      const leaderboard = pointsService.getPointsLeaderboard(page, pageSize, period);
      return sendSuccess(res, leaderboard, 'Points leaderboard loaded');
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  '/points/signin-leaderboard',
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    query('period').optional().isIn(['all', '7d', '30d']),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      const period = typeof req.query.period === 'string' ? req.query.period : 'all';
      const leaderboard = pointsService.getSigninLeaderboard(page, pageSize, period);
      return sendSuccess(res, leaderboard, 'Sign-in leaderboard loaded');
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
