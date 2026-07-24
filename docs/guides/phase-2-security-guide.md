# Phase 2 Security Guide

## Authentication Security

### Password Security
- Passwords are hashed using bcrypt with a cost factor of 12
- Minimum password length: 8 characters
- Password change requires current password verification
- All sessions are revoked on password change

### Token Security
- Access tokens expire after 15 minutes (configurable)
- Refresh tokens expire after 7 days (configurable)
- Refresh tokens are hashed before database storage
- Refresh tokens are rotated on every use
- Reused refresh tokens are rejected (token reuse detection)

### Session Security
- Sessions track IP address and user agent
- Device type is detected and stored
- Sessions can be revoked individually or all at once
- Sessions automatically expire based on access token expiry

### Account Lockout
- Account locks after 5 failed login attempts
- Lock duration: 15 minutes
- Failed attempts are tracked in the database
- Lock status is checked before password verification

## Authorization Security

### Permission Model
- Permissions are defined as (resource, action, scope) tuples
- Resources: users, calls, contacts, campaigns, system
- Actions: read, create, update, delete
- Scopes: own, team, department, organization, tenant, cross-tenant

### Scope Hierarchy
```
own < team < department < organization < tenant < cross-tenant
```
A user with "tenant" scope can access resources with "own", "team", "department", "organization", or "tenant" scope.

### Resource Ownership
- "own" scope requires the resource to be owned by the requesting user
- Resource ownership is checked at authorization time
- Resource context must be provided for "own" scope checks

### Tenant Isolation
- All users belong to exactly one tenant
- Tenant context is extracted from JWT token
- Tenant isolation guard validates tenant access
- Cross-tenant access is prevented at all layers

## Audit Logging

### Logged Events
- User creation
- Login success/failure
- Logout
- Token refresh
- Password change
- Authorization denials
- Permission checks

### Audit Data
- Tenant ID (for isolation)
- User ID (for attribution)
- Action type
- Resource type
- Resource ID
- Metadata (JSON)
- IP address
- User agent
- Timestamp

## Socket.IO Security

### Authentication
- JWT token required for connection
- Token verified via API endpoint
- Unauthorized connections are rejected
- User context attached to socket

### Tenant Isolation
- Sockets join tenant-specific rooms
- Events are scoped to tenant rooms
- Cross-tenant event leakage is prevented

## Frontend Security

### Token Storage
- Access and refresh tokens stored in localStorage
- Tokens are included in Authorization header
- Tokens are automatically refreshed on expiry

### Protected Routes
- ProtectedRoute component checks authentication
- Unauthenticated users redirected to login
- Loading state shown during auth check

## Security Best Practices

### For Developers
1. Always use the @RequirePermission decorator on protected endpoints
2. Always include the JwtAuthGuard on protected routes
3. Always use the TenantIsolationGuard for tenant-scoped operations
4. Never trust client-side authorization for security decisions
5. Always log security events via the audit service
6. Always validate tenant context in service methods

### For Operations
1. Rotate JWT secrets regularly
2. Monitor audit logs for suspicious activity
3. Review failed login attempts
4. Monitor cross-tenant access attempts
5. Keep dependencies updated
6. Use strong secrets in production

### For Users
1. Use strong, unique passwords
2. Enable MFA when available (future feature)
3. Review active sessions regularly
4. Report suspicious activity
5. Logout from all devices when needed

## Testing Security

### Security Test Coverage
- Account lockout behavior
- Refresh token rotation
- Session revocation
- Cross-tenant access prevention
- IDOR prevention
- Privilege escalation prevention
- Authorization bypass attempts

### Running Security Tests
```bash
# Run all tests
pnpm test

# Run authorization tests
pnpm test authorization

# Run with coverage
pnpm test --coverage
```

## Incident Response

### Security Incident Types
- Brute force attacks (monitored via account lockout)
- Token theft (monitored via audit logs)
- Cross-tenant access attempts (monitored via audit logs)
- Privilege escalation attempts (monitored via authorization denials)

### Response Procedures
1. Identify affected users and tenants
2. Review audit logs for timeline
3. Revoke affected sessions
4. Force password reset if needed
5. Escalate to security team if needed
