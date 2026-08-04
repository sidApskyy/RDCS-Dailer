-- CreateTable
CREATE TABLE "campaign_dial_queues" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "agent_id" TEXT,
    "call_session_id" TEXT,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dialed_at" TIMESTAMP(3),
    "skipped_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaign_dial_queues_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "campaign_dial_queues" ADD CONSTRAINT "campaign_dial_queues_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_dial_queues" ADD CONSTRAINT "campaign_dial_queues_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_dial_queues" ADD CONSTRAINT "campaign_dial_queues_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_dial_queues" ADD CONSTRAINT "campaign_dial_queues_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "campaign_dial_queues" ADD CONSTRAINT "campaign_dial_queues_call_session_id_fkey" FOREIGN KEY ("call_session_id") REFERENCES "call_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "campaign_dial_queues_tenant_id_campaign_id_status_idx" ON "campaign_dial_queues"("tenant_id", "campaign_id", "status");
CREATE INDEX "campaign_dial_queues_tenant_id_campaign_id_priority_idx" ON "campaign_dial_queues"("tenant_id", "campaign_id", "priority");
CREATE UNIQUE INDEX "campaign_dial_queues_call_session_id_key" ON "campaign_dial_queues"("call_session_id");

-- AlterTable: Campaign
ALTER TABLE "campaigns" ADD COLUMN "dialing_mode" TEXT NOT NULL DEFAULT 'manual';

-- AlterTable: AgentPresence
ALTER TABLE "agent_presences" ADD COLUMN "current_queue_id" TEXT;
ALTER TABLE "agent_presences" ADD COLUMN "last_call_ended_at" TIMESTAMP(3);
