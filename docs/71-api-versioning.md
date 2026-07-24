# 71 — API Versioning

**Document Control**

| Property | Value |
|----------|-------|
| Title | API Versioning |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the API versioning strategy for the RDCS In-House Dialer Platform. Versioning ensures backward compatibility while allowing the API to evolve.

## 2. Versioning Strategy

The platform uses **URL path versioning**.

```
https://api.rdcs.example.com/api/v1/{resource}
```

URL path versioning is chosen because it is:
- Explicit and easy to understand.
- Cache-friendly.
- Compatible with most API consumers and tooling.
- Simple to implement with Nginx and NestJS.

## 3. Version Lifecycle

| Phase | Duration | Description |
|-------|----------|-------------|
| Current | Active | Current version receiving new features |
| Supported | 6 months after new version | Receives bug fixes and security updates |
| Deprecated | 6 months after support ends | No new features; sunset header returned |
| Retired | After deprecation | Removed; requests return 410 Gone |

## 4. Version Header

Responses include a header indicating the API version:

```
X-API-Version: v1
```

For deprecated versions:

```
Sunset: Mon, 21 Jan 2027 00:00:00 GMT
Deprecation: true
```

## 5. Breaking vs. Non-Breaking Changes

### 5.1 Non-Breaking Changes

Non-breaking changes can be added to the current version without a new version:

- Adding new endpoints.
- Adding optional query parameters.
- Adding new fields to response objects.
- Adding new event types.
- Relaxing validation (e.g., allowing longer strings).

### 5.2 Breaking Changes

Breaking changes require a new API version:

- Removing or renaming fields.
- Changing field types.
- Changing response structure.
- Removing endpoints.
- Changing authentication requirements.
- Changing required parameters.
- Changing behavior of existing endpoints.

## 6. Backward Compatibility

- Old versions remain available for at least 6 months after a new version release.
- Breaking changes are announced 3 months in advance.
- Migration guides published for each major version.
- API documentation maintained for all supported versions.

## 7. NestJS Implementation

### 7.1 Global Prefix

```typescript
const app = await NestFactory.create(AppModule);
app.setGlobalPrefix('api/v1');
```

### 7.2 Versioned Controllers (Future)

```typescript
@Controller({ path: 'campaigns', version: '1' })
export class CampaignControllerV1 { ... }

@Controller({ path: 'campaigns', version: '2' })
export class CampaignControllerV2 { ... }
```

## 8. WebSocket Versioning

WebSocket API versioning is less granular. Major changes are communicated via:
- Socket.IO namespace versioning (e.g., `/v2/agents` future).
- Event schema versioning in event payload.
- Client/server compatibility handshake.

## 9. Webhook Versioning

- Webhook payload includes `version` field.
- Subscribers can filter or handle multiple versions.
- Breaking webhook changes announced with migration period.
- Subscribers can specify preferred version in subscription config.

## 10. Documentation

- Swagger UI available per version: `/api/v1/docs`, `/api/v2/docs`.
- OpenAPI spec per version: `/api/v1/docs-json`.
- Changelog documents version differences.
- API documentation portal lists supported versions and deprecation dates.

## 11. Migration Guide Template

For each new version, publish a migration guide containing:
- Summary of changes.
- Breaking changes with before/after examples.
- New features and endpoints.
- Deprecated fields and alternatives.
- Timeline for old version retirement.
- Code examples for common migrations.

## 12. Versioning Best Practices

- Avoid unnecessary version changes.
- Design APIs to be extensible (e.g., add fields, not change them).
- Use feature flags to introduce behavioral changes before a new version.
- Monitor usage of deprecated versions.
- Communicate early and often with API consumers.
