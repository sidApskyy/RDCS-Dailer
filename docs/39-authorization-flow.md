# 39 — Authorization Flow

**Document Control**

| Property | Value |
|----------|-------|
| Title | Authorization Flow |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the authorization flow for the RDCS In-House Dialer Platform. Authorization is based on Role-Based Access Control (RBAC) with resource-action-scope permission tuples and multi-tenant data scoping.

## 2. Authorization Model

### 2.1 Permission Tuple

A permission is defined as:

```
{resource}:{action}:{scope}
```

- **resource**: The entity being accessed (e.g., campaign, lead, call, user).
- **action**: The operation (e.g., create, read, update, delete, execute, export, manage).
- **scope**: The data visibility boundary (e.g., own, team, department, organization, tenant, cross-tenant).

### 2.2 Scopes

| Scope | Definition |
|-------|------------|
| own | Data owned by or assigned to the user. |
| team | Data belonging to teams the user is a member of. |
| department | Data belonging to the user's assigned departments. |
| organization | Data belonging to the user's organization. |
| tenant | All data within the tenant. |
| cross-tenant | All data across all tenants (Super Admin only). |

### 2.3 Roles

Predefined roles:

- Super Admin
- Tenant Admin
- Supervisor
- Agent
- QA Analyst
- Compliance Officer
- Read-Only
- CRM Integrator

Custom roles can be created by Tenant Admins with a subset of permissions.

## 3. Authorization Flow Diagram

```mermaid
sequenceDiagram
    participant Client
    participant API as API Gateway
    participant AuthGuard as JWT Auth Guard
    permGuard as Permissions Guard
    participant PermService as Permission Service
    participant DB as PostgreSQL
    participant Service as Application Service

    Client->>API: Request with access token
    API->>AuthGuard: Validate JWT
    AuthGuard-->>API: user context (userId, tenantId, roles)
    API->>permGuard: @RequirePermission('campaign', 'read', 'department')
    permGuard->>PermService: evaluate(userId, 'campaign', 'read', 'department')
    PermService->>DB: Load user roles and permissions
    DB-->>PermService: roles + permissions
    PermService->>PermService: Check if user has permission and scope
    alt Unauthorized
        PermService-->>permGuard: false
        permGuard-->>API: 403 Forbidden
        API-->>Client: 403 Forbidden
    else Authorized
        PermService-->>permGuard: true
        permGuard->>Service: Pass request with user context
        Service->>Service: Apply data scope filters
        Service->>DB: Query with tenantId + scope filters
        DB-->>Service: Data
        Service-->>API: Response
        API-->>Client: Response
    end
```

## 4. Permission Evaluation

### 4.1 Algorithm

1. Extract `userId`, `tenantId`, and `roles` from JWT.
2. Load permissions for the user's roles from cache (Redis) or database.
3. Check if any permission matches `{resource}:{action}:{requestedScope}` or broader scope.
4. If cross-tenant permission is required, verify Super Admin role.
5. If permission found, proceed; otherwise return 403.
6. Service layer applies data scope filters to queries based on the resolved scope.

### 4.2 Scope Hierarchy

```
own < team < department < organization < tenant < cross-tenant
```

A user with `tenant` scope can access data at any narrower scope. A user with `department` scope cannot access `organization` or `tenant` data.

## 5. Data Scoping

### 5.1 Query Filters

Service layer applies scope-based filters:

| Scope | Filter Applied |
|-------|----------------|
| own | `assignedToUserId = userId` or `createdBy = userId` |
| team | `assignedToTeamId IN (userTeams)` or `teamId IN (userTeams)` |
| department | `departmentId IN (userDepartments)` |
| organization | `organizationId IN (userOrganizations)` |
| tenant | `tenantId = tenantId` |
| cross-tenant | no tenant filter (Super Admin) |

### 5.2 Example

A Supervisor with `lead:read:department` can view leads where `departmentId` is in their assigned departments. An Agent with `lead:read:own` can only view leads assigned to them.

## 6. Permission Guard

```typescript
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private permissionService: PermissionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionRequirement>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const allowed = await this.permissionService.evaluate(user, required.resource, required.action, required.scope);
    if (!allowed) {
      throw new ForbiddenException(`Missing permission ${required.resource}:${required.action}:${required.scope}`);
    }
    return true;
  }
}
```

## 7. Permission Decorator

```typescript
export const RequirePermission = (resource: string, action: string, scope: string) =>
  SetMetadata('permissions', { resource, action, scope });

// Usage
@Controller('api/v1/campaigns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CampaignController {
  @Get()
  @RequirePermission('campaign', 'read', 'department')
  async findAll(@Tenant() tenantId: string, @User() user: UserContext) { ... }
}
```

## 8. Frontend Permission Enforcement

- Frontend receives the user's permission list at login.
- `usePermission` hook checks permissions and hides/disables UI elements.
- Server is the authoritative source; frontend checks are UX-only.

## 9. Dynamic Permission Checks

Some actions require dynamic evaluation beyond static permissions, e.g.:
- A Supervisor can only update campaigns in their department.
- An Agent can only set disposition on their own calls.
- A user can only update their own profile.

These are enforced in the application service by checking resource ownership.

## 10. Audit of Authorization Decisions

- All denied authorization attempts are logged with user, resource, action, scope, and reason.
- Successful authorization is not logged per request but is included in audit for data mutations.

## 11. Permission Caching

- User permission list cached in Redis with TTL of 15 minutes.
- Cache invalidated on role or permission changes.
- Cache key: `permissions:{tenantId}:{userId}`.

## 12. API Key Authorization

- API keys are associated with a permission set and tenant.
- Requests with API keys bypass user roles but are evaluated against the key's permissions.
- API keys cannot have cross-tenant scope.

## 13. Authorization Flow for WebSocket

1. Socket.IO handshake authenticates user via JWT.
2. User joined to rooms based on tenant, department, team, and userId.
3. Real-time events are emitted only to authorized rooms.
4. Supervisor monitoring requires `realtime:monitor` permission.

## 14. Delegation & Impersonation

- Not supported in MVP.
- Future: Super Admin may impersonate tenant admin for support, with full audit trail.

## 15. Authorization Testing

- Unit tests for permission evaluation matrix.
- Integration tests for controller authorization.
- E2E tests verifying UI hides features based on role.
- Security tests for horizontal/vertical privilege escalation.

## 16. Endpoints

See `09-permission-matrix.md` and `40-rest-api-documentation.md` for role and endpoint authorization details.
