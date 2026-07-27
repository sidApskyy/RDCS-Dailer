-- CreateTable
CREATE TABLE "call_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "phone_number" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'queued',
    "termination_reason" TEXT,
    "disposition_id" TEXT,
    "provider_ref" TEXT,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dialing_at" TIMESTAMP(3),
    "ringing_at" TIMESTAMP(3),
    "connected_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "call_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_presences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_presences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "call_sessions_tenant_id_agent_id_state_idx" ON "call_sessions"("tenant_id", "agent_id", "state");
CREATE INDEX "call_sessions_tenant_id_lead_id_idx" ON "call_sessions"("tenant_id", "lead_id");
CREATE INDEX "call_sessions_tenant_id_created_at_idx" ON "call_sessions"("tenant_id", "created_at");
CREATE UNIQUE INDEX "agent_presences_tenant_id_agent_id_key" ON "agent_presences"("tenant_id", "agent_id");
CREATE INDEX "agent_presences_tenant_id_status_idx" ON "agent_presences"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_disposition_id_fkey" FOREIGN KEY ("disposition_id") REFERENCES "dispositions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agent_presences" ADD CONSTRAINT "agent_presences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_presences" ADD CONSTRAINT "agent_presences_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
