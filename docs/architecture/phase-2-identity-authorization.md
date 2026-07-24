# Phase 2: Identity and Authorization Architecture

## Overview

Phase 2 establishes a production-grade identity, tenancy, and authorization foundation for the RDCS Dialer Platform. This document describes the architecture, security principles, and implementation details.

## Security Principles

1. **Backend is the authoritative security boundary** - All authorization decisions are made server-side
2. **Strict tenant isolation** - Tenants are completely isolated at all layers
3. **Defense in depth** - Multiple security controls at different layers
4. **Audit everything** - All security events are logged
5. **Zero trust** - Never trust client-side authorization for security decisions

## Architecture Components

### 1. Identity Domain

#### Models
- **User**: Core user entity with tenant, organization, and security fields
- **UserInvitation**: User invitation flow for controlled onboarding
- **PasswordResetToken**: Secure password reset mechanism
- **EmailVerificationToken**: Email verification for account security
- **Session**: Active session tracking with device metadata

#### Key Features
- Account lifecycle management (create, activate, deactivate)
- Multi-factor authentication support (schema ready)
- Account lockout after failed login attempts
- Password strength validation

### 2. Authentication

#### Token Strategy
- **Access Token**: Short-lived JWT (15 minutes default)
- **Refresh Token**: Long-lived JWT (7 days default) with rotation
- **Token Storage**: Refresh tokens hashed in database

#### Security Features
- Refresh token rotation on every use
- Refresh token reuse detection
- Session revocation (single and all sessions)
- IP address and user agent tracking
- Device type detection
- Account lockout (5 attempts, 15 minute lockout)

#### Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login with session creation
- `POST /auth/refresh` - Refresh access token
- `POST /auth/verify` - Token verification for Socket.IO
- `POST /auth/logout` - Logout from current session
- `POST /auth/logout-all` - Logout from all sessions
- `GET /auth/sessions` - List active sessions
- `POST /auth/change-password` - Change password

### 3. Multi-Tenancy

#### Tenant Model
- **Tenant**: Top-level isolation boundary
- **Organization**: Hierarchical organization within tenant
- **User**: Belongs to exactly one tenant

#### Isolation Enforcement
- Tenant context middleware extracts tenant from JWT
- Tenant isolation guard validates tenant access
- All queries scoped to tenant ID
- Cross-tenant access tests prevent data leakage

### 4. Organizational Hierarchy

#### Hierarchy Structure
- Organization model supports self-referential hierarchy
- Types: organization, department, team
- Parent-child relationships for nested structures

#### Authorization Support
- Organization service provides hierarchy traversal
- User organization path calculation
- Descendant organization ID resolution
- User membership by organization scope

### 5. Role-Based Access Control (RBAC)

#### Models
- **Role**: Named role with tenant scope
- **Permission**: Resource-action-scope tuple
- **UserRole**: User-role assignment
- **RolePermission**: Role-permission assignment

#### Permission Structure
- **Resource**: Entity type (users, calls, contacts, campaigns)
- **Action**: Operation (read, create, update, delete)
- **Scope**: Visibility boundary (own, team, department, organization, tenant, cross-tenant)

#### Scope Hierarchy
```
own < team < department < organization < tenant < cross-tenant
```

### 6. Authorization Architecture

#### Guards
- **JwtAuthGuard**: Validates JWT tokens
- **PermissionsGuard**: Enforces permission requirements
- **TenantIsolationGuard**: Validates tenant access

#### Decorators
- **@RequirePermission(resource, action, scope)**: Method-level permission requirement
- **@CurrentUser()**: Inject current user context

#### Services
- **AuthService**: Authentication operations
- **RbacService**: Permission checking with scope evaluation
- **OrganizationService**: Hierarchy traversal

### 7. Session Security

#### Session Management
- Session creation on login with device metadata
- Session listing for user visibility
- Session revocation (single and all)
- Automatic expiration handling

#### Device Tracking
- IP address capture
- User agent capture
- Device type detection (mobile, tablet, desktop)
- Device info JSON storage

### 8. Account Security

#### Protection Mechanisms
- Account lockout after 5 failed attempts
- 15-minute lockout duration
- Failed login attempt tracking
- Password change with current password verification
- All sessions revoked on password change

### 9. Audit Logging

#### Audit Events
- User creation
- Login success/failure
- Logout
- Token refresh
- Password change
- Authorization denials
- Permission checks

#### Audit Model
- Tenant ID for isolation
- User ID for attribution
- Action type
- Resource type
- Resource ID
- Metadata JSON
- IP address
- User agent
- Timestamp

### 10. Frontend Authentication

#### Components
- **AuthProvider**: React context for auth state
- **useAuth**: Hook for auth operations
- **ProtectedRoute**: Route guard for authenticated pages
- **LoginPage**: Login form with tenant selection

#### Features
- Token storage in localStorage
- Automatic token refresh
- Login/logout functionality
- Protected route redirects
- Token decoding for user context

### 11. Socket.IO Authentication

#### Authentication Flow
- JWT token validation on connection
- Token verification via API endpoint
- User context attachment to socket
- Tenant-specific room assignment
- Connection logging with user context

#### Security Features
- Unauthorized connection rejection
- Tenant room isolation
- User context in all events
- Error logging

## Security Controls Summary

### Authentication Controls
- [x] Password hashing with bcrypt (cost 12)
- [x] JWT access tokens with expiration
- [x] Refresh token rotation
- [x] Refresh token hashing
- [x] Account lockout
- [x] Session management
- [x] IP and user agent tracking

### Authorization Controls
- [x] RBAC with roles and permissions
- [x] Scope-based authorization
- [x] Resource ownership checking
- [x] Tenant isolation enforcement
- [x] Permission guards
- [x] Authorization denial logging

### Tenant Isolation Controls
- [x] Tenant context middleware
- [x] Tenant isolation guard
- [x] Tenant-scoped queries
- [x] Cross-tenant access tests
- [x] Socket.IO tenant rooms

### Audit Controls
- [x] Authentication event logging
- [x] Authorization event logging
- [x] Security event metadata
- [x] IP and user agent capture
- [x] Tenant-scoped audit logs

## Testing Strategy

### Unit Tests
- Authentication flow tests
- Session management tests
- Permission checking tests
- Tenant isolation tests
- Scope evaluation tests

### Integration Tests
- Cross-tenant access prevention
- IDOR prevention
- Privilege escalation prevention
- Session revocation
- Token rotation

### Security Tests
- Account lockout behavior
- Refresh token reuse detection
- Cross-tenant data access
- Authorization bypass attempts
- Session hijacking prevention

## Migration Notes

### Database Changes
- Added UserInvitation model
- Added PasswordResetToken model
- Added EmailVerificationToken model
- Updated Session model (refreshTokenHash, deviceInfo, revokedAt)
- Added tenant relationships to token models

### Breaking Changes
- Session.refreshToken renamed to Session.refreshTokenHash
- Refresh tokens now hashed before storage
- Old sessions will be invalidated after migration

## Future Enhancements

### Phase 3 Considerations
- MFA implementation (TOTP)
- Password reset flow completion
- Email verification flow completion
- User invitation flow completion
- Rate limiting implementation
- API key management
- SSO integration (optional)

### Security Enhancements
- Key rotation strategy
- Hardware key support (WebAuthn)
- Biometric authentication
- Anomaly detection
- Real-time threat monitoring
