# 17 — Clean Architecture Layers

**Document Control**

| Property | Value |
|----------|-------|
| Title | Clean Architecture Layers |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the Clean Architecture layers for the RDCS In-House Dialer Platform. The architecture isolates domain logic from frameworks, UI, databases, telephony engines, and external services, making the system testable, maintainable, and evolvable.

## 2. Layer Overview

Each domain module is organized into four concentric layers:

1. **Domain Layer**: Entities, value objects, aggregates, domain services, domain events, repository interfaces.
2. **Application Layer**: Use cases, command/query handlers, DTOs, application services, ports.
3. **Infrastructure Layer**: Repository implementations, ORM mappings, external API clients, message queue producers.
4. **Interface Layer**: HTTP controllers, WebSocket gateways, presenters, CLI commands.

The Dependency Rule: source code dependencies point inward. Outer layers depend on inner layers; inner layers know nothing about outer layers.

## 3. Layer Diagram

```
┌─────────────────────────────────────┐
│         Interface Layer             │  Controllers, Gateways, CLI, Presenters
│   (Web, API, Socket, Jobs, Tests)   │
├─────────────────────────────────────┤
│       Application Layer             │  Use Cases, Commands, Queries, DTOs, Services
├─────────────────────────────────────┤
│         Domain Layer                │  Entities, Value Objects, Aggregates,
│                                     │  Domain Services, Domain Events, Repository Interfaces
├─────────────────────────────────────┤
│          Core Primitives            │  Result, BaseEntity, DomainEvent, Errors
└─────────────────────────────────────┘
```

Infrastructure adapters sit beside the domain/application layers and implement interfaces defined in the domain.

## 4. Domain Layer

### 4.1 Responsibility
- Encapsulate business rules and logic.
- Define entities, aggregates, and value objects.
- Define domain events and repository interfaces.
- Have no dependencies on frameworks, databases, or external services.

### 4.2 Example: Campaign Aggregate

```typescript
// domain/campaign.ts
export class Campaign extends AggregateRoot {
  private constructor(
    public readonly id: CampaignId,
    public readonly tenantId: TenantId,
    public name: string,
    public mode: DialingMode,
    private _status: CampaignStatus,
    private schedule: CampaignSchedule,
    private callerIds: CallerId[],
    private dispositions: Disposition[],
    private complianceRules: ComplianceRules,
  ) {}

  activate(): Result<void> {
    if (this._status !== CampaignStatus.DRAFT && this._status !== CampaignStatus.PAUSED) {
      return Result.fail('Campaign can only be activated from draft or paused');
    }
    if (this.callerIds.length === 0) {
      return Result.fail('Campaign must have at least one caller ID');
    }
    this._status = CampaignStatus.ACTIVE;
    this.addDomainEvent(new CampaignActivatedEvent(this.id.value));
    return Result.ok();
  }

  pause(reason: string): Result<void> {
    if (this._status !== CampaignStatus.ACTIVE) {
      return Result.fail('Only active campaigns can be paused');
    }
    this._status = CampaignStatus.PAUSED;
    this.addDomainEvent(new CampaignPausedEvent(this.id.value, reason));
    return Result.ok();
  }
}
```

### 4.3 Domain Events

```typescript
export class CampaignActivatedEvent extends DomainEvent {
  constructor(public readonly campaignId: string) {
    super('CampaignActivated');
  }
}
```

### 4.4 Repository Interfaces

```typescript
export interface ICampaignRepository {
  findById(id: CampaignId): Promise<Campaign | null>;
  findByTenant(tenantId: TenantId): Promise<Campaign[]>;
  save(campaign: Campaign): Promise<void>;
}
```

## 5. Application Layer

### 5.1 Responsibility
- Orchestrate use cases by coordinating domain objects and repositories.
- Define command and query handlers (CQRS).
- Define application services, DTOs, and mappers.
- Depend only on the domain layer and repository interfaces.

### 5.2 Example: Activate Campaign Use Case

```typescript
// application/commands/activate-campaign.command.ts
export class ActivateCampaignCommand {
  constructor(
    public readonly campaignId: string,
    public readonly tenantId: string,
    public readonly userId: string,
  ) {}
}

// application/commands/activate-campaign.handler.ts
@Injectable()
export class ActivateCampaignHandler implements ICommandHandler<ActivateCampaignCommand> {
  constructor(
    @Inject(ICampaignRepository) private readonly repo: ICampaignRepository,
    private readonly eventBus: EventBus,
    private readonly permissionService: PermissionService,
  ) {}

  async execute(command: ActivateCampaignCommand): Promise<Result<void>> {
    await this.permissionService.ensure(command.userId, 'campaign', 'update', 'tenant');
    const campaign = await this.repo.findById(new CampaignId(command.campaignId));
    if (!campaign) return Result.fail('Campaign not found');

    const result = campaign.activate();
    if (result.isFailure()) return result;

    await this.repo.save(campaign);
    await this.eventBus.publish(campaign.domainEvents);
    campaign.clearDomainEvents();
    return Result.ok();
  }
}
```

## 6. Infrastructure Layer

### 6.1 Responsibility
- Implement repository interfaces using Prisma, Redis, or other storage.
- Provide external service clients (telephony, email, SMS, AI).
- Implement message queue producers and consumers.
- Map between domain models and persistence models.

### 6.2 Example: Prisma Campaign Repository

```typescript
// infrastructure/persistence/prisma-campaign.repository.ts
@Injectable()
export class PrismaCampaignRepository implements ICampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: CampaignId): Promise<Campaign | null> {
    const data = await this.prisma.campaign.findUnique({ where: { id: id.value } });
    return data ? this.toDomain(data) : null;
  }

  async save(campaign: Campaign): Promise<void> {
    const data = this.toPersistence(campaign);
    await this.prisma.campaign.upsert({
      where: { id: campaign.id.value },
      create: data,
      update: data,
    });
  }

  private toDomain(data: PrismaCampaign): Campaign { /* ... */ }
  private toPersistence(campaign: Campaign): PrismaCampaign { /* ... */ }
}
```

## 7. Interface Layer

### 7.1 Responsibility
- Handle HTTP requests, WebSocket events, and job execution.
- Convert DTOs to commands/queries and pass to application layer.
- Format responses and handle errors.
- Apply authentication, authorization, and validation.

### 7.2 Example: Campaign Controller

```typescript
// interface/http/campaign.controller.ts
@Controller('api/v1/campaigns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CampaignController {
  constructor(private readonly commandBus: CommandBus, private readonly queryBus: QueryBus) {}

  @Post(':id/activate')
  @RequirePermission('campaign', 'update', 'tenant')
  async activate(
    @Param('id') id: string,
    @Tenant() tenantId: string,
    @User() userId: string,
  ) {
    const command = new ActivateCampaignCommand(id, tenantId, userId);
    const result = await this.commandBus.execute(command);
    if (result.isFailure()) throw new BadRequestException(result.error);
    return { data: { activated: true } };
  }
}
```

## 8. Dependency Direction

| From Layer | Can Depend On |
|------------|---------------|
| Interface | Application, Core, Infrastructure (via DI) |
| Application | Domain, Core |
| Infrastructure | Domain, Core, Application (for mappers only) |
| Domain | Core only |
| Core | None (or standard library types) |

Infrastructure depends on domain interfaces, not the other way around. This is the dependency inversion principle in practice.

## 9. Cross-Cutting Concerns

### 9.1 Logging
- Domain and application layers use an abstract logger interface.
- Infrastructure provides Pino implementation.
- Correlation IDs attached in interface layer.

### 9.2 Validation
- Input DTOs validated in interface layer using Zod/class-validator.
- Domain invariants enforced in domain entities and services.
- Database constraints enforced by Prisma.

### 9.3 Transactions
- Unit of Work pattern for operations spanning multiple aggregates.
- Prisma transactions for atomic persistence within a module.
- Distributed transactions avoided; use sagas and compensating actions for cross-module consistency.

### 9.4 Error Handling
- Domain errors return `Result<T>` or throw domain exceptions.
- Global exception filter maps domain errors to HTTP responses.
- Operational errors (network, external service) handled with retry and circuit breaker.

## 10. Testing by Layer

| Layer | Test Type | Approach |
|-------|-----------|----------|
| Domain | Unit | Jest, pure TypeScript, no framework |
| Application | Unit / Integration | Mock repositories, test handlers |
| Infrastructure | Integration | Testcontainers for PostgreSQL/Redis |
| Interface | Integration / E2E | Supertest, Socket.IO test client, Playwright |

## 11. Framework Isolation

- Domain and application layers contain no NestJS decorators or Prisma imports.
- NestJS is used only in the interface and composition layers.
- Prisma is used only in infrastructure repositories and migration scripts.
- React/Next.js are entirely absent from the backend.
- This isolation enables future migration to microservices, alternate frameworks, or databases without rewriting business logic.

## 12. Example Module Layout

```
modules/campaign/
├── domain/
│   ├── campaign.ts
│   ├── campaign-id.ts
│   ├── campaign-status.ts
│   ├── campaign-schedule.ts
│   ├── dialing-mode.ts
│   ├── events/
│   │   ├── campaign-activated.event.ts
│   │   └── campaign-paused.event.ts
│   └── repository.interface.ts
├── application/
│   ├── commands/
│   │   ├── activate-campaign.command.ts
│   │   ├── activate-campaign.handler.ts
│   │   ├── create-campaign.command.ts
│   │   └── create-campaign.handler.ts
│   ├── queries/
│   │   ├── get-campaigns.query.ts
│   │   └── get-campaigns.handler.ts
│   ├── dto/
│   │   ├── create-campaign.dto.ts
│   │   └── campaign-response.dto.ts
│   └── services/
│       └── campaign-activation.service.ts
├── infrastructure/
│   ├── persistence/
│   │   └── prisma-campaign.repository.ts
│   └── mappers/
│       └── campaign.mapper.ts
├── interface/
│   └── http/
│       └── campaign.controller.ts
└── campaign.module.ts
```

## 13. Migration Path to Microservices

The Clean Architecture layers naturally support decomposition:
- Domain and application layers move into a service.
- Infrastructure adapters become service-specific clients.
- Interface layer becomes HTTP/gRPC/queue handlers.
- Cross-module communication uses event bus or API contracts already defined in the application layer.
