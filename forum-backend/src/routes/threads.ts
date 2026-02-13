import { type NextFunction, type Request, type Response, Router } from 'express';
import { body, param } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { threadService } from '../services/threadService';
import type { AuthUser } from '../types/models';
import { sendSuccess } from '../utils/apiResponse';
import { HttpError } from '../utils/httpError';

const router = Router();

router.get(
  '/threads/:id',
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const threadId = Number(req.params.id);
      const result = threadService.getThreadById(threadId);
      return sendSuccess(res, result, '获取主题详情成功');
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/threads',
  requireAuth,
  [
    body('forumId').isInt({ min: 1 }),
    body('title').isString().trim().isLength({ min: 3, max: 255 }),
    body('content').isString().trim().isLength({ min: 1, max: 20000 }),
    body('type').optional().isString().trim().isLength({ min: 3, max: 20 }),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as Request & { user?: AuthUser }).user;
      if (!user) {
        throw new HttpError(401, '未登录');
      }
      const result = threadService.createThread(req.body, user);
      return sendSuccess(res, result, '创建主题成功', 201);
    } catch (error) {
      return next(error);
    }
  }
);

router.put(
  '/threads/:id',
  requireAuth,
  [
    param('id').isInt({ min: 1 }),
    body('title').optional().isString().trim().isLength({ min: 3, max: 255 }),
    body('content').optional().isString().trim().isLength({ min: 1, max: 20000 }),
    body('type').optional().isString().trim().isLength({ min: 3, max: 20 }),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as Request & { user?: AuthUser }).user;
      if (!user) {
        throw new HttpError(401, '未登录');
      }
      const threadId = Number(req.params.id);
      const result = threadService.updateThread(threadId, req.body, user);
      return sendSuccess(res, result, '更新主题成功');
    } catch (error) {
      return next(error);
    }
  }
);

router.delete(
  '/threads/:id',
  requireAuth,
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as Request & { user?: AuthUser }).user;
      if (!user) {
        throw new HttpError(401, '未登录');
      }
      const threadId = Number(req.params.id);
      threadService.deleteThread(threadId, user);
      return sendSuccess(res, null, '删除主题成功');
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
