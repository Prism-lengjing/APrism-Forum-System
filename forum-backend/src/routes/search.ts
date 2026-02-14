import { type NextFunction, type Request, type Response, Router } from 'express';
import { query } from 'express-validator';
import { validateRequest } from '../middleware/validate';
import { searchService } from '../services/searchService';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();

router.get(
  '/search/threads',
  [
    query('q').isString().trim().isLength({ min: 1, max: 100 }),
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    query('forumId').optional().isInt({ min: 1 }),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const keyword = String(req.query.q);
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      const forumId = req.query.forumId ? Number(req.query.forumId) : undefined;
      const result = searchService.searchThreads(keyword, page, pageSize, forumId);
      return sendSuccess(res, result, 'Thread search loaded');
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  '/search/users',
  [
    query('q').isString().trim().isLength({ min: 1, max: 100 }),
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const keyword = String(req.query.q);
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      const result = searchService.searchUsers(keyword, page, pageSize);
      return sendSuccess(res, result, 'User search loaded');
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
