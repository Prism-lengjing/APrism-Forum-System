import { type NextFunction, type Request, type Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { body, param, query } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { notificationService } from '../services/notificationService';
import type { AuthUser } from '../types/models';
import { sendSuccess } from '../utils/apiResponse';
import { HttpError } from '../utils/httpError';

const router = Router();
const JWT_SECRET =
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-2026';

interface TokenPayload extends JwtPayload {
  id: number;
  username: string;
  role: string;
}

function getCurrentUser(req: Request): AuthUser {
  const user = (req as Request & { user?: AuthUser }).user;
  if (!user) {
    throw new HttpError(401, 'Unauthorized');
  }
  return user;
}

function parseUnreadOnly(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return value === 'true' || value === '1';
}

function isTokenPayload(payload: unknown): payload is TokenPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const checked = payload as Partial<TokenPayload>;
  return (
    typeof checked.id === 'number' &&
    typeof checked.username === 'string' &&
    typeof checked.role === 'string'
  );
}

function getStreamToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  if (typeof req.query.token === 'string' && req.query.token.trim().length > 0) {
    return req.query.token.trim();
  }
  return null;
}

function getStreamUser(req: Request): AuthUser {
  const existing = (req as Request & { user?: AuthUser }).user;
  if (existing) {
    return existing;
  }

  const token = getStreamToken(req);
  if (!token) {
    throw new HttpError(401, 'Unauthorized');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!isTokenPayload(decoded)) {
      throw new HttpError(401, 'Unauthorized');
    }
    return {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
  } catch {
    throw new HttpError(401, 'Unauthorized');
  }
}

router.get(
  '/notifications',
  requireAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    query('unreadOnly').optional().isIn(['true', 'false', '1', '0']),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      const unreadOnly = parseUnreadOnly(req.query.unreadOnly);
      const data = notificationService.listNotifications(user.id, page, pageSize, unreadOnly);
      return sendSuccess(res, data, 'Notifications loaded');
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  '/notifications/unread-count',
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      const unreadCount = notificationService.getUnreadCount(user.id);
      return sendSuccess(res, { unreadCount }, 'Unread count loaded');
    } catch (error) {
      return next(error);
    }
  }
);

router.get('/notifications/settings', requireAuth, (req, res, next) => {
  try {
    const user = getCurrentUser(req);
    const data = notificationService.getSettings(user.id);
    return sendSuccess(res, data, 'Notification settings loaded');
  } catch (error) {
    return next(error);
  }
});

router.put(
  '/notifications/settings',
  requireAuth,
  [
    body().custom((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Invalid request body');
      }

      const allowed = new Set([
        'threadReplyEnabled',
        'postReplyEnabled',
        'mentionEnabled',
        'postLikedEnabled',
        'followEnabled',
        'systemEnabled',
        'dndEnabled',
        'dndStartHour',
        'dndEndHour',
      ]);
      const unknownKeys = Object.keys(value).filter((key) => !allowed.has(key));
      if (unknownKeys.length > 0) {
        throw new Error(`Unknown fields: ${unknownKeys.join(', ')}`);
      }
      return true;
    }),
    body('threadReplyEnabled')
      .optional()
      .custom((value) => typeof value === 'boolean'),
    body('postReplyEnabled')
      .optional()
      .custom((value) => typeof value === 'boolean'),
    body('mentionEnabled')
      .optional()
      .custom((value) => typeof value === 'boolean'),
    body('postLikedEnabled')
      .optional()
      .custom((value) => typeof value === 'boolean'),
    body('followEnabled')
      .optional()
      .custom((value) => typeof value === 'boolean'),
    body('systemEnabled')
      .optional()
      .custom((value) => typeof value === 'boolean'),
    body('dndEnabled')
      .optional()
      .custom((value) => typeof value === 'boolean'),
    body('dndStartHour')
      .optional()
      .custom((value) => Number.isInteger(value) && value >= 0 && value <= 23),
    body('dndEndHour')
      .optional()
      .custom((value) => Number.isInteger(value) && value >= 0 && value <= 23),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      const data = notificationService.updateSettings(user.id, {
        threadReplyEnabled:
          typeof req.body.threadReplyEnabled === 'boolean'
            ? req.body.threadReplyEnabled
            : undefined,
        postReplyEnabled:
          typeof req.body.postReplyEnabled === 'boolean'
            ? req.body.postReplyEnabled
            : undefined,
        mentionEnabled:
          typeof req.body.mentionEnabled === 'boolean'
            ? req.body.mentionEnabled
            : undefined,
        postLikedEnabled:
          typeof req.body.postLikedEnabled === 'boolean'
            ? req.body.postLikedEnabled
            : undefined,
        followEnabled:
          typeof req.body.followEnabled === 'boolean'
            ? req.body.followEnabled
            : undefined,
        systemEnabled:
          typeof req.body.systemEnabled === 'boolean'
            ? req.body.systemEnabled
            : undefined,
        dndEnabled:
          typeof req.body.dndEnabled === 'boolean'
            ? req.body.dndEnabled
            : undefined,
        dndStartHour:
          typeof req.body.dndStartHour === 'number'
            ? req.body.dndStartHour
            : undefined,
        dndEndHour:
          typeof req.body.dndEndHour === 'number' ? req.body.dndEndHour : undefined,
      });
      return sendSuccess(res, data, 'Notification settings updated');
    } catch (error) {
      return next(error);
    }
  }
);

router.post('/notifications/read-all', requireAuth, (req, res, next) => {
  try {
    const user = getCurrentUser(req);
    const data = notificationService.markAllAsRead(user.id);
    return sendSuccess(res, data, 'All notifications marked as read');
  } catch (error) {
    return next(error);
  }
});

router.post(
  '/notifications/system',
  requireAuth,
  [
    body('userId').isInt({ min: 1 }),
    body('title').isString().trim().isLength({ min: 1, max: 255 }),
    body('content').optional().isString().isLength({ max: 10000 }),
  ],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      if (user.role !== 'admin') {
        throw new HttpError(403, 'Forbidden');
      }

      const targetUserId = Number(req.body.userId);
      const title = String(req.body.title).trim();
      const content =
        typeof req.body.content === 'string' ? req.body.content.trim() : null;

      const notificationId = notificationService.createSystemNotification(
        targetUserId,
        title,
        content
      );

      return sendSuccess(
        res,
        { notificationId },
        'System notification created',
        201
      );
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/notifications/:id/read',
  requireAuth,
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getCurrentUser(req);
      const notificationId = Number(req.params.id);
      const data = notificationService.markAsRead(user.id, notificationId);
      return sendSuccess(res, data, 'Notification marked as read');
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  '/notifications/stream',
  [query('token').optional().isString().isLength({ min: 1 })],
  validateRequest,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getStreamUser(req);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }

      const writeData = (payload: unknown) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      res.write('retry: 10000\n\n');
      writeData({
        type: 'connected',
        userId: user.id,
        unreadCount: notificationService.getUnreadCount(user.id),
        createdAt: new Date().toISOString(),
      });

      const unsubscribe = notificationService.subscribe(user.id, (payload) => {
        writeData(payload);
      });

      const heartbeat = setInterval(() => {
        res.write(': ping\n\n');
      }, 25000);

      req.on('close', () => {
        clearInterval(heartbeat);
        unsubscribe();
        res.end();
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
