import type { Response } from 'express';

export function sendSuccess(
  res: Response,
  data: unknown,
  message = 'OK',
  statusCode = 200
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  details?: unknown
) {
  return res.status(statusCode).json({
    success: false,
    message,
    details,
  });
}
