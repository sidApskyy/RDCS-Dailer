import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

import { RequestUser } from '../../modules/auth/strategies/jwt.strategy';

interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
    const user = req.user;

    if (!user || !user.tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }

    next();
  }
}
