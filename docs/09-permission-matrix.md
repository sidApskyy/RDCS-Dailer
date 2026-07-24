# 09 — Permission Matrix

**Document Control**

| Property | Value |
|----------|-------|
| Title | Complete Permission Matrix |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the complete permission model for the RDCS In-House Dialer Platform. Permissions are expressed as tuples of **resource**, **action**, and **scope**. Roles are collections of permissions with default scopes.

## 2. Permission Format

A permission is represented as:

```
{resource}:{action}:{scope}
```

Where:
- **resource**: tenant, organization, department, team, user, role, campaign, lead, call, recording, report, setting, webhook, integration, dnc, compliance, audit, dashboard, api, ai, qa, notification, system.
- **action**: create, read, update, delete, manage, execute, export, monitor, score, approve.
- **scope**: own, team, department, organization, tenant, cross-tenant.

## 3. Scopes

| Scope | Description |
|-------|-------------|
| own | Data owned by or assigned to the user (e.g., own calls). |
| team | Data belonging to teams the user is a member of or supervises. |
| department | Data belonging to the user's assigned departments. |
| organization | Data belonging to the user's organization. |
| tenant | All data within the tenant. |
| cross-tenant | All data across all tenants (Super Admin only). |

## 4. Predefined Roles

| Role | Default Scope | Typical Use |
|------|---------------|-------------|
| Super Admin | cross-tenant | Platform administration, tenant provisioning, security. |
| Tenant Admin | tenant | Organization and tenant configuration. |
| Supervisor | department/team | Team management, monitoring, coaching. |
| Agent | own/team | Make calls, set dispositions, callbacks. |
| QA Analyst | tenant/department | Review recordings, score calls. |
| Compliance Officer | tenant | Manage DNC, audit compliance. |
| Read-Only | department | View reports and dashboards without mutation. |
| CRM Integrator | tenant | API/webhook integration. |

## 5. Resource-Level Permission Matrix

### 5.1 Tenant & Organization

| Permission | Super Admin | Tenant Admin | Supervisor | Agent | QA | Compliance | Read-Only | Integrator |
|------------|:-----------:|:------------:|:----------:|:-----:|:--:|:----------:|:---------:|:----------:|
| tenant:create | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| tenant:read | ✓ | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (own) |
| tenant:update | ✓ | ✓ (own) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| tenant:delete | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| organization:manage | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| department:manage | ✓ | ✓ | ✓ (own dept) | ✗ | ✗ | ✗ | ✗ | ✗ |
| team:manage | ✓ | ✓ | ✓ (own dept) | ✗ | ✗ | ✗ | ✗ | ✗ |

### 5.2 Users & Roles

| Permission | Super Admin | Tenant Admin | Supervisor | Agent | QA | Compliance | Read-Only | Integrator |
|------------|:-----------:|:------------:|:----------:|:-----:|:--:|:----------:|:---------:|:----------:|
| user:create | ✓ | ✓ | ✓ (team/dept) | ✗ | ✗ | ✗ | ✗ | ✗ |
| user:read | ✓ | ✓ (tenant) | ✓ (dept/team) | ✓ (team) | ✓ (dept) | ✓ (tenant) | ✓ (scope) | ✓ (tenant) |
| user:update | ✓ | ✓ (tenant) | ✓ (dept/team) | ✓ (own) | ✗ | ✗ | ✗ | ✗ |
| user:delete | ✓ | ✓ (tenant) | ✓ (dept/team) | ✗ | ✗ | ✗ | ✗ | ✗ |
| role:create | ✓ | ✓ (tenant) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| role:read | ✓ | ✓ (tenant) | ✓ (tenant) | ✓ (own) | ✓ (tenant) | ✓ (tenant) | ✓ (tenant) | ✓ (tenant) |
| role:update | ✓ | ✓ (tenant) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| role:delete | ✓ | ✓ (tenant) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

### 5.3 Campaigns

| Permission | Super Admin | Tenant Admin | Supervisor | Agent | QA | Compliance | Read-Only | Integrator |
|------------|:-----------:|:------------:|:----------:|:-----:|:--:|:----------:|:---------:|:----------:|
| campaign:create | ✓ | ✓ | ✓ (dept) | ✗ | ✗ | ✗ | ✗ | ✗ |
| campaign:read | ✓ | ✓ (tenant) | ✓ (dept) | ✓ (team) | ✓ (dept) | ✓ (tenant) | ✓ (scope) | ✓ (tenant) |
| campaign:update | ✓ | ✓ (tenant) | ✓ (dept) | ✗ | ✗ | ✗ | ✗ | ✗ |
| campaign:delete | ✓ | ✓ (tenant) | ✓ (dept) | ✗ | ✗ | ✗ | ✗ | ✗ |
| campaign:execute | ✓ | ✓ | ✓ (dept) | ✓ (own) | ✗ | ✗ | ✗ | ✗ |
| campaign:pause | ✓ | ✓ | ✓ (dept) | ✗ | ✗ | ✗ | ✗ | ✗ |
| campaign:export | ✓ | ✓ | ✓ (dept) | ✗ | ✗ | ✗ | ✗ | ✗ |

### 5.4 Leads

| Permission | Super Admin | Tenant Admin | Supervisor | Agent | QA | Compliance | Read-Only | Integrator |
|------------|:-----------:|:------------:|:----------:|:-----:|:--:|:----------:|:---------:|:----------:|
| lead:create | ✓ | ✓ | ✓ (dept/team) | ✗ | ✗ | ✗ | ✗ | ✓ (tenant) |
| lead:read | ✓ | ✓ (tenant) | ✓ (dept/team) | ✓ (own/team) | ✓ (dept) | ✓ (tenant) | ✓ (scope) | ✓ (tenant) |
| lead:update | ✓ | ✓ | ✓ (dept/team) | ✓ (own) | ✗ | ✗ | ✗ | ✓ (tenant) |
| lead:delete | ✓ | ✓ | ✓ (dept/team) | ✗ | ✗ | ✗ | ✗ | ✗ |
| lead:import | ✓ | ✓ | ✓ (dept) | ✗ | ✗ | ✗ | ✗ | ✓ (tenant) |
| lead:export | ✓ | ✓ | ✓ (dept) | ✗ | ✗ | ✗ | ✗ | ✓ (tenant) |
| lead:assign | ✓ | ✓ | ✓ (dept/team) | ✗ | ✗ | ✗ | ✗ | ✗ |
| lead:recycle | ✓ | ✓ | ✓ (dept) | ✗ | ✗ | ✗ | ✗ | ✗ |

### 5.5 Calls & Dispositions

| Permission | Super Admin | Tenant Admin | Supervisor | Agent | QA | Compliance | Read-Only | Integrator |
|------------|:-----------:|:------------:|:----------:|:-----:|:--:|:----------:|:---------:|:----------:|
| call:create | ✓ | ✓ | ✓ | ✓ (own) | ✗ | ✗ | ✗ | ✓ (tenant) |
| call:read | ✓ | ✓ (tenant) | ✓ (dept/team) | ✓ (own/team) | ✓ (dept) | ✓ (tenant) | ✓ (scope) | ✓ (tenant) |
| call:update | ✓ | ✓ | ✓ | ✓ (own) | ✗ | ✗ | ✗ | ✗ |
| disposition:set | ✓ | ✓ | ✓ | ✓ (own) | ✗ | ✗ | ✗ | ✗ |
| callback:create | ✓ | ✓ | ✓ | ✓ (own) | ✗ | ✗ | ✗ | ✗ |
| transfer:execute | ✓ | ✓ | ✓ | ✓ (own) | ✗ | ✗ | ✗ | ✗ |

### 5.6 Recordings

| Permission | Super Admin | Tenant Admin | Supervisor | Agent | QA | Compliance | Read-Only | Integrator |
|------------|:-----------:|:------------:|:----------:|:-----:|:--:|:----------:|:---------:|:----------:|
| recording:read | ✓ | ✓ (tenant) | ✓ (dept/team) | ✓ (own) | ✓ (dept) | ✓ (tenant) | ✗ | ✗ |
| recording:download | ✓ | ✓ (tenant) | ✓ (dept/team) | ✓ (own) | ✓ (dept) | ✓ (tenant) | ✗ | ✗ |
| recording:delete | ✓ | ✓ (tenant) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| recording:pause | ✓ | ✓ | ✓ | ✓ (own) | ✗ | ✗ | ✗ | ✗ |

### 5.7 Reports & Dashboards

| Permission | Super Admin | Tenant Admin | Supervisor | Agent | QA | Compliance | Read-Only | Integrator |
|------------|:-----------:|:------------:|:----------:|:-----:|:--:|:----------:|:---------:|:----------:|
| report:read | ✓ | ✓ (tenant) | ✓ (dept/team) | ✓ (own) | ✓ (dept) | ✓ (tenant) | ✓ (scope) | ✓ (tenant) |
| report:export | ✓ | ✓ | ✓ (dept) | ✗ | ✓ (dept) | ✓ (tenant) | ✗ | ✗ |
| dashboard:read | ✓ | ✓ | ✓ (dept/team) | ✓ (own) | ✓ (dept) | ✓ (tenant) | ✓ (scope) | ✓ (tenant) |
| dashboard:monitor | ✓ | ✓ | ✓ (dept/team) | ✗ | ✗ | ✗ | ✗ | ✗ |
| executive:read | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ (tenant) | ✗ | ✗ |

### 5.8 Compliance & DNC

| Permission | Super Admin | Tenant Admin | Supervisor | Agent | QA | Compliance | Read-Only | Integrator |
|------------|:-----------:|:------------:|:----------:|:-----:|:--:|:----------:|:---------:|:----------:|
| dnc:manage | ✓ | ✓ (tenant) | ✗ | ✗ | ✗ | ✓ (tenant) | ✗ | ✗ |
| compliance:read | ✓ | ✓ (tenant) | ✓ (dept) | ✗ | ✗ | ✓ (tenant) | ✓ (tenant) | ✗ |
| compliance:manage | ✓ | ✓ (tenant) | ✗ | ✗ | ✗ | ✓ (tenant) | ✗ | ✗ |
| audit:read | ✓ | ✓ (tenant) | ✗ | ✗ | ✗ | ✓ (tenant) | ✗ | ✗ |
| audit:export | ✓ | ✓ (tenant) | ✗ | ✗ | ✗ | ✓ (tenant) | ✗ | ✗ |

### 5.9 AI & QA

| Permission | Super Admin | Tenant Admin | Supervisor | Agent | QA | Compliance | Read-Only | Integrator |
|------------|:-----------:|:------------:|:----------:|:-----:|:--:|:----------:|:---------:|:----------:|
| ai:read | ✓ | ✓ (tenant) | ✓ (dept) | ✓ (own) | ✓ (dept) | ✓ (tenant) | ✗ | ✗ |
| ai:configure | ✓ | ✓ (tenant) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| qa:score | ✓ | ✓ | ✓ (dept) | ✗ | ✓ (dept) | ✗ | ✗ | ✗ |
| qa:read | ✓ | ✓ | ✓ (dept) | ✓ (own) | ✓ (dept) | ✗ | ✗ | ✗ |

### 5.10 Integrations & API

| Permission | Super Admin | Tenant Admin | Supervisor | Agent | QA | Compliance | Read-Only | Integrator |
|------------|:-----------:|:------------:|:----------:|:-----:|:--:|:----------:|:---------:|:----------:|
| api:manage | ✓ | ✓ (tenant) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (tenant) |
| webhook:manage | ✓ | ✓ (tenant) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (tenant) |
| integration:manage | ✓ | ✓ (tenant) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (tenant) |
| setting:manage | ✓ | ✓ (tenant) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| system:read | ✓ | ✓ (tenant) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| system:manage | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

## 6. Permission Evaluation Logic

1. The API Gateway extracts `tenantId`, `userId`, and roles from the JWT.
2. The target resource’s tenant is compared to the request tenant; mismatches are rejected (except cross-tenant Super Admin).
3. The Permission Service evaluates the requested `{resource}:{action}:{scope}` against the user's roles and the resource's ownership/department/team assignment.
4. If scope is insufficient, the request is rejected with 403 and an audit event is emitted.
5. Data-layer queries are further filtered by the resolved scope to prevent data leakage.

## 7. Extending Roles

Tenant Admins can create custom roles by selecting any subset of the permissions above. Default scopes can be narrowed but not expanded beyond the tenant boundary. Cross-tenant scope is reserved for Super Admin.

## 8. Implementation Notes

- Permissions are stored in the database as normalized rows linked to roles.
- The NestJS `PermissionsGuard` checks permissions at the controller level.
- Service-level authorization revalidates permissions before mutations.
- The frontend receives the user's permission list at login and hides UI elements accordingly.
