import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import type { AuthUser } from '../types/models';
import { HttpError } from '../utils/httpError';

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-2026';

interface TokenPayload extends JwtPayload {
  id: number;
  username: string;
  role: string;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieToken = req.cookies?.token;
  if (typeof cookieToken === 'string' && cookieToken.trim().length > 0) {
    return cookieToken;
  }

  return null;
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

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return next(new HttpError(401, '未提供认证令牌'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!isTokenPayload(decoded)) {
      return next(new HttpError(401, '认证令牌无效'));
    }

    const user: AuthUser = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    };
    (req as Request & { user?: AuthUser }).user = user;
    return next();
  } catch (_error) {
    return next(new HttpError(401, '认证令牌无效或已过期'));
  }
}
