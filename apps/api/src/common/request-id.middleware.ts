import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function requestId(_req: Request, res: Response, next: NextFunction) {
  res.locals.requestId = randomUUID();
  next();
}
