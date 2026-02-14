import { type NextFunction, type Request, type Response, Router } from 'express';
import { body, param, query } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { messageService } from '../services/messageService';
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
  '/messages/conversations',
  requireAuth,
  [query('page').optional().isInt({ min: 1 }), query('pageSize').optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      const result = messageService.listConversations(user.id, page, pageSize);
      return sendSuccess(res, result, 'Conversations loaded');
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  '/messages/conversations/:id',
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
      const conversationId = Number(req.params.id);
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 50);
      const result = messageService.listMessages(conversationId, user.id, page, pageSize);
      return sendSuccess(res, result, 'Messages loaded');
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/messages',
  requireAuth,
  [
    body('receiverId').isInt({ min: 1 }),
    body('content').isString().trim().isLength({ min: 1, max: 5000 }),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      const result = messageService.sendMessage(
        {
          receiverId: Number(req.body.receiverId),
          content: String(req.body.content),
        },
        user.id
      );
      return sendSuccess(res, result, 'Message sent', 201);
    } catch (error) {
      return next(error);
    }
  }
);

router.delete(
  '/messages/:id',
  requireAuth,
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      const messageId = Number(req.params.id);
      const result = messageService.deleteMessage(messageId, user.id);
      return sendSuccess(res, result, 'Message deleted');
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
