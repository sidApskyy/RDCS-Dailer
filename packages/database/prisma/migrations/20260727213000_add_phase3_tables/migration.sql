-- Align the original session table with the current Prisma schema
ALTER TABLE "sessions" RENAME COLUMN "refresh_token" TO "refresh_token_hash";
DROP INDEX IF EXISTS "sessions_refresh_token_key";
DROP INDEX IF EXISTS "sessions_refresh_token_idx";
ALTER TABLE "sessions" ADD COLUMN "deviceInfo" JSONB;
ALTER TABLE "sessions" ADD COLUMN "revoked_at" TIMESTAMP(3);
CREATE INDEX "sessions_refresh_token_hash_idx" ON "sessions"("refresh_token_hash");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
-- CreateTable
CREATE TABLE "user_invitations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role_ids" TEXT[],
    "invited_by" TEXT NOT NULL,
    "accepted_by" TEXT,
    "accepted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "type" TEXT DEFAULT 'outbound',
    "purpose" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "settings" JSONB,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "campaign_schedules" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_schedules_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "campaign_caller_ids" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "label" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_caller_ids_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "campaign_dispositions" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "disposition_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_dispositions_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "lead_lists" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "processed_rows" INTEGER NOT NULL DEFAULT 0,
    "successful_rows" INTEGER NOT NULL DEFAULT 0,
    "failed_rows" INTEGER NOT NULL DEFAULT 0,
    "duplicate_rows" INTEGER NOT NULL DEFAULT 0,
    "suppressed_rows" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "lead_lists_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "campaign_lead_lists" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "lead_list_id" TEXT NOT NULL,
    "attached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_lead_lists_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "lead_list_imports" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lead_list_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "processed_rows" INTEGER NOT NULL DEFAULT 0,
    "successful_rows" INTEGER NOT NULL DEFAULT 0,
    "failed_rows" INTEGER NOT NULL DEFAULT 0,
    "duplicate_rows" INTEGER NOT NULL DEFAULT 0,
    "suppressed_rows" INTEGER NOT NULL DEFAULT 0,
    "invalid_rows" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_list_imports_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "lead_import_rows" (
    "id" TEXT NOT NULL,
    "import_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "raw_data" JSONB NOT NULL,
    "normalized_data" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "lead_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_import_rows_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "lead_list_id" TEXT,
    "campaign_id" TEXT,
    "external_id" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "custom_fields" JSONB,
    "assigned_to" TEXT,
    "assigned_team_id" TEXT,
    "assigned_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "lead_phones" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'mobile',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "normalized_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_phones_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "lead_dispositions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "disposition_id" TEXT NOT NULL,
    "phone_number" TEXT,
    "notes" TEXT,
    "applied_by" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_dispositions_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "dispositions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "retry_behavior" TEXT,
    "callback_eligible" BOOLEAN NOT NULL DEFAULT false,
    "dnc_behavior" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositions_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "callbacks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "phone_number" TEXT,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "scheduled_by" TEXT NOT NULL,
    "assigned_to" TEXT,
    "assigned_team_id" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "callbacks_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "phone_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "type" TEXT NOT NULL,
    "source" TEXT,
    "method" TEXT,
    "evidence" JSONB,
    "jurisdiction" TEXT,
    "scope" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "dnc_lists" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'tenant',
    "scope" TEXT NOT NULL DEFAULT 'all',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "entry_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dnc_lists_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "dnc_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "dnc_list_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "reason" TEXT,
    "source" TEXT,
    "added_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dnc_entries_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "calling_windows" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calling_windows_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "holiday_calendars" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holiday_calendars_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "lead_attempts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "phone_number" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "disposition_id" TEXT,
    "agent_id" TEXT,
    "outcome" TEXT,
    "duration" INTEGER,
    "recording_url" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "provider_ref" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_attempts_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "lead_eligibility_decisions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "metadata" JSONB,
    "evaluated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "lead_eligibility_decisions_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_token_key" ON "user_invitations"("token");


-- CreateIndex
CREATE INDEX "user_invitations_token_idx" ON "user_invitations"("token");


-- CreateIndex
CREATE INDEX "user_invitations_email_idx" ON "user_invitations"("email");


-- CreateIndex
CREATE INDEX "user_invitations_expires_at_idx" ON "user_invitations"("expires_at");


-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");


-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");


-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");


-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");


-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_key" ON "email_verification_tokens"("token");


-- CreateIndex
CREATE INDEX "email_verification_tokens_token_idx" ON "email_verification_tokens"("token");


-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");


-- CreateIndex
CREATE INDEX "email_verification_tokens_email_idx" ON "email_verification_tokens"("email");


-- CreateIndex
CREATE INDEX "email_verification_tokens_expires_at_idx" ON "email_verification_tokens"("expires_at");


-- CreateIndex
CREATE INDEX "campaigns_tenant_id_status_idx" ON "campaigns"("tenant_id", "status");


-- CreateIndex
CREATE INDEX "campaigns_tenant_id_organization_id_idx" ON "campaigns"("tenant_id", "organization_id");


-- CreateIndex
CREATE INDEX "campaigns_start_date_end_date_idx" ON "campaigns"("start_date", "end_date");


-- CreateIndex
CREATE UNIQUE INDEX "campaigns_tenant_id_slug_key" ON "campaigns"("tenant_id", "slug");


-- CreateIndex
CREATE INDEX "campaign_schedules_campaign_id_idx" ON "campaign_schedules"("campaign_id");


-- CreateIndex
CREATE INDEX "campaign_caller_ids_campaign_id_idx" ON "campaign_caller_ids"("campaign_id");


-- CreateIndex
CREATE INDEX "campaign_dispositions_campaign_id_idx" ON "campaign_dispositions"("campaign_id");


-- CreateIndex
CREATE UNIQUE INDEX "campaign_dispositions_campaign_id_disposition_id_key" ON "campaign_dispositions"("campaign_id", "disposition_id");


-- CreateIndex
CREATE INDEX "lead_lists_tenant_id_status_idx" ON "lead_lists"("tenant_id", "status");


-- CreateIndex
CREATE INDEX "lead_lists_tenant_id_organization_id_idx" ON "lead_lists"("tenant_id", "organization_id");


-- CreateIndex
CREATE INDEX "campaign_lead_lists_campaign_id_idx" ON "campaign_lead_lists"("campaign_id");


-- CreateIndex
CREATE INDEX "campaign_lead_lists_lead_list_id_idx" ON "campaign_lead_lists"("lead_list_id");


-- CreateIndex
CREATE UNIQUE INDEX "campaign_lead_lists_campaign_id_lead_list_id_key" ON "campaign_lead_lists"("campaign_id", "lead_list_id");


-- CreateIndex
CREATE INDEX "lead_list_imports_tenant_id_status_idx" ON "lead_list_imports"("tenant_id", "status");


-- CreateIndex
CREATE INDEX "lead_list_imports_lead_list_id_idx" ON "lead_list_imports"("lead_list_id");


-- CreateIndex
CREATE INDEX "lead_list_imports_created_at_idx" ON "lead_list_imports"("created_at");


-- CreateIndex
CREATE INDEX "lead_import_rows_import_id_status_idx" ON "lead_import_rows"("import_id", "status");


-- CreateIndex
CREATE INDEX "lead_import_rows_import_id_row_number_idx" ON "lead_import_rows"("import_id", "row_number");


-- CreateIndex
CREATE INDEX "lead_import_rows_lead_id_idx" ON "lead_import_rows"("lead_id");


-- CreateIndex
CREATE INDEX "leads_tenant_id_status_idx" ON "leads"("tenant_id", "status");


-- CreateIndex
CREATE INDEX "leads_tenant_id_campaign_id_idx" ON "leads"("tenant_id", "campaign_id");


-- CreateIndex
CREATE INDEX "leads_tenant_id_lead_list_id_idx" ON "leads"("tenant_id", "lead_list_id");


-- CreateIndex
CREATE INDEX "leads_tenant_id_assigned_to_idx" ON "leads"("tenant_id", "assigned_to");


-- CreateIndex
CREATE INDEX "leads_tenant_id_assigned_team_id_idx" ON "leads"("tenant_id", "assigned_team_id");


-- CreateIndex
CREATE INDEX "leads_tenant_id_status_assigned_to_idx" ON "leads"("tenant_id", "status", "assigned_to");


-- CreateIndex
CREATE INDEX "leads_external_id_idx" ON "leads"("external_id");


-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");


-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");


-- CreateIndex
CREATE INDEX "lead_phones_tenant_id_phone_number_idx" ON "lead_phones"("tenant_id", "phone_number");


-- CreateIndex
CREATE INDEX "lead_phones_lead_id_idx" ON "lead_phones"("lead_id");


-- CreateIndex
CREATE INDEX "lead_phones_created_at_idx" ON "lead_phones"("created_at");


-- CreateIndex
CREATE UNIQUE INDEX "lead_phones_lead_id_phone_number_key" ON "lead_phones"("lead_id", "phone_number");


-- CreateIndex
CREATE INDEX "lead_dispositions_tenant_id_lead_id_idx" ON "lead_dispositions"("tenant_id", "lead_id");


-- CreateIndex
CREATE INDEX "lead_dispositions_tenant_id_campaign_id_idx" ON "lead_dispositions"("tenant_id", "campaign_id");


-- CreateIndex
CREATE INDEX "lead_dispositions_lead_id_idx" ON "lead_dispositions"("lead_id");


-- CreateIndex
CREATE UNIQUE INDEX "dispositions_code_key" ON "dispositions"("code");


-- CreateIndex
CREATE INDEX "dispositions_tenant_id_code_idx" ON "dispositions"("tenant_id", "code");


-- CreateIndex
CREATE INDEX "dispositions_tenant_id_category_idx" ON "dispositions"("tenant_id", "category");


-- CreateIndex
CREATE INDEX "dispositions_tenant_id_is_active_idx" ON "dispositions"("tenant_id", "is_active");


-- CreateIndex
CREATE INDEX "callbacks_tenant_id_status_idx" ON "callbacks"("tenant_id", "status");


-- CreateIndex
CREATE INDEX "callbacks_tenant_id_scheduled_for_idx" ON "callbacks"("tenant_id", "scheduled_for");


-- CreateIndex
CREATE INDEX "callbacks_lead_id_idx" ON "callbacks"("lead_id");


-- CreateIndex
CREATE INDEX "callbacks_campaign_id_idx" ON "callbacks"("campaign_id");


-- CreateIndex
CREATE INDEX "callbacks_assigned_to_idx" ON "callbacks"("assigned_to");


-- CreateIndex
CREATE INDEX "callbacks_assigned_team_id_idx" ON "callbacks"("assigned_team_id");


-- CreateIndex
CREATE INDEX "callbacks_priority_scheduled_for_idx" ON "callbacks"("priority", "scheduled_for");


-- CreateIndex
CREATE INDEX "consents_tenant_id_lead_id_idx" ON "consents"("tenant_id", "lead_id");


-- CreateIndex
CREATE INDEX "consents_tenant_id_phone_number_idx" ON "consents"("tenant_id", "phone_number");


-- CreateIndex
CREATE INDEX "consents_status_idx" ON "consents"("status");


-- CreateIndex
CREATE INDEX "consents_created_at_idx" ON "consents"("created_at");


-- CreateIndex
CREATE INDEX "dnc_lists_tenant_id_type_idx" ON "dnc_lists"("tenant_id", "type");


-- CreateIndex
CREATE INDEX "dnc_lists_tenant_id_is_active_idx" ON "dnc_lists"("tenant_id", "is_active");


-- CreateIndex
CREATE INDEX "dnc_entries_tenant_id_phone_number_idx" ON "dnc_entries"("tenant_id", "phone_number");


-- CreateIndex
CREATE INDEX "dnc_entries_dnc_list_id_idx" ON "dnc_entries"("dnc_list_id");


-- CreateIndex
CREATE INDEX "dnc_entries_expires_at_idx" ON "dnc_entries"("expires_at");


-- CreateIndex
CREATE UNIQUE INDEX "dnc_entries_dnc_list_id_phone_number_key" ON "dnc_entries"("dnc_list_id", "phone_number");


-- CreateIndex
CREATE INDEX "calling_windows_tenant_id_is_active_idx" ON "calling_windows"("tenant_id", "is_active");


-- CreateIndex
CREATE INDEX "holiday_calendars_tenant_id_date_idx" ON "holiday_calendars"("tenant_id", "date");


-- CreateIndex
CREATE INDEX "lead_attempts_tenant_id_lead_id_idx" ON "lead_attempts"("tenant_id", "lead_id");


-- CreateIndex
CREATE INDEX "lead_attempts_tenant_id_campaign_id_idx" ON "lead_attempts"("tenant_id", "campaign_id");


-- CreateIndex
CREATE INDEX "lead_attempts_lead_id_attempt_number_idx" ON "lead_attempts"("lead_id", "attempt_number");


-- CreateIndex
CREATE INDEX "lead_attempts_started_at_idx" ON "lead_attempts"("started_at");


-- CreateIndex
CREATE INDEX "lead_attempts_agent_id_idx" ON "lead_attempts"("agent_id");


-- CreateIndex
CREATE INDEX "lead_eligibility_decisions_tenant_id_lead_id_idx" ON "lead_eligibility_decisions"("tenant_id", "lead_id");


-- CreateIndex
CREATE INDEX "lead_eligibility_decisions_tenant_id_campaign_id_idx" ON "lead_eligibility_decisions"("tenant_id", "campaign_id");


-- CreateIndex
CREATE INDEX "lead_eligibility_decisions_evaluated_at_idx" ON "lead_eligibility_decisions"("evaluated_at");


-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "campaign_schedules" ADD CONSTRAINT "campaign_schedules_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "campaign_caller_ids" ADD CONSTRAINT "campaign_caller_ids_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "campaign_dispositions" ADD CONSTRAINT "campaign_dispositions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "campaign_dispositions" ADD CONSTRAINT "campaign_dispositions_disposition_id_fkey" FOREIGN KEY ("disposition_id") REFERENCES "dispositions"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_lists" ADD CONSTRAINT "lead_lists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_lists" ADD CONSTRAINT "lead_lists_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_lists" ADD CONSTRAINT "lead_lists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "campaign_lead_lists" ADD CONSTRAINT "campaign_lead_lists_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "campaign_lead_lists" ADD CONSTRAINT "campaign_lead_lists_lead_list_id_fkey" FOREIGN KEY ("lead_list_id") REFERENCES "lead_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_list_imports" ADD CONSTRAINT "lead_list_imports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_list_imports" ADD CONSTRAINT "lead_list_imports_lead_list_id_fkey" FOREIGN KEY ("lead_list_id") REFERENCES "lead_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_list_imports" ADD CONSTRAINT "lead_list_imports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_import_rows" ADD CONSTRAINT "lead_import_rows_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "lead_list_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_lead_list_id_fkey" FOREIGN KEY ("lead_list_id") REFERENCES "lead_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_team_id_fkey" FOREIGN KEY ("assigned_team_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_phones" ADD CONSTRAINT "lead_phones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_phones" ADD CONSTRAINT "lead_phones_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_dispositions" ADD CONSTRAINT "lead_dispositions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_dispositions" ADD CONSTRAINT "lead_dispositions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_dispositions" ADD CONSTRAINT "lead_dispositions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_dispositions" ADD CONSTRAINT "lead_dispositions_disposition_id_fkey" FOREIGN KEY ("disposition_id") REFERENCES "dispositions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_dispositions" ADD CONSTRAINT "lead_dispositions_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "dispositions" ADD CONSTRAINT "dispositions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "dispositions" ADD CONSTRAINT "dispositions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "callbacks" ADD CONSTRAINT "callbacks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "callbacks" ADD CONSTRAINT "callbacks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "callbacks" ADD CONSTRAINT "callbacks_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "callbacks" ADD CONSTRAINT "callbacks_scheduled_by_fkey" FOREIGN KEY ("scheduled_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "callbacks" ADD CONSTRAINT "callbacks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "callbacks" ADD CONSTRAINT "callbacks_assigned_team_id_fkey" FOREIGN KEY ("assigned_team_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "dnc_lists" ADD CONSTRAINT "dnc_lists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "dnc_lists" ADD CONSTRAINT "dnc_lists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "dnc_entries" ADD CONSTRAINT "dnc_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "dnc_entries" ADD CONSTRAINT "dnc_entries_dnc_list_id_fkey" FOREIGN KEY ("dnc_list_id") REFERENCES "dnc_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "dnc_entries" ADD CONSTRAINT "dnc_entries_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "calling_windows" ADD CONSTRAINT "calling_windows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "holiday_calendars" ADD CONSTRAINT "holiday_calendars_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_attempts" ADD CONSTRAINT "lead_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_attempts" ADD CONSTRAINT "lead_attempts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_attempts" ADD CONSTRAINT "lead_attempts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_attempts" ADD CONSTRAINT "lead_attempts_disposition_id_fkey" FOREIGN KEY ("disposition_id") REFERENCES "dispositions"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "lead_attempts" ADD CONSTRAINT "lead_attempts_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


