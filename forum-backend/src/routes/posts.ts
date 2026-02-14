import { type NextFunction, type Request, type Response, Router } from 'express';
import { body, param } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { postService } from '../services/postService';
import type { AuthUser } from '../types/models';
import { sendSuccess } from '../utils/apiResponse';
import { HttpError } from '../utils/httpError';

const router = Router();

router.get(
  '/threads/:threadId/posts',
  [param('threadId').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const threadId = Number(req.params.threadId);
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      const result = postService.getThreadPosts(threadId, page, pageSize);
      return sendSuccess(res, result, 'Posts loaded');
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/posts',
  requireAuth,
  [
    body('threadId').isInt({ min: 1 }),
    body('content').isString().trim().isLength({ min: 1, max: 10000 }),
    body('parentId').optional().isInt({ min: 1 }),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as Request & { user?: AuthUser }).user;
      if (!user) {
        throw new HttpError(401, 'Unauthorized');
      }
      const result = postService.createPost(req.body, user);
      return sendSuccess(res, result, 'Post created', 201);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/posts/:id/like',
  requireAuth,
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as Request & { user?: AuthUser }).user;
      if (!user) {
        throw new HttpError(401, 'Unauthorized');
      }
      const postId = Number(req.params.id);
      const result = postService.likePost(postId, user);
      return sendSuccess(res, result, 'Post liked');
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
