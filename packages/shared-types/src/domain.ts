export enum TenantStatus {
  Active = 'active',
  Suspended = 'suspended',
  Trial = 'trial',
}

export enum UserStatus {
  Active = 'active',
  Inactive = 'inactive',
  Locked = 'locked',
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}
