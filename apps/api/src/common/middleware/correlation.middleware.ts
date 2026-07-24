import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RequestWithId extends Request {
  id: string;
}

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    // Check for existing request ID in header
    const requestId = req.headers['x-request-id'] as string;

    // Generate new ID if not provided
    req.id = requestId || this.generateRequestId();

    // Add request ID to response header
    res.setHeader('X-Request-ID', req.id);

    next();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
