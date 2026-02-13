import type { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/apiResponse';

export function validateRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  return sendError(res, '请求参数验证失败', 400, errors.array());
}
