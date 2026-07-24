import { SetMetadata } from '@nestjs/common';

import { PermissionTuple } from '../rbac.service';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermission = (resource: string, action: string, scope = 'own') =>
  SetMetadata(PERMISSIONS_KEY, { resource, action, scope } as PermissionTuple);
