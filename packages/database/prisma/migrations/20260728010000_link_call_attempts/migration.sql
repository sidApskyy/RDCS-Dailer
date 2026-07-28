-- AlterTable
ALTER TABLE "call_sessions" ADD COLUMN "attempt_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "call_sessions_attempt_id_key" ON "call_sessions"("attempt_id");

-- AddForeignKey
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "lead_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
