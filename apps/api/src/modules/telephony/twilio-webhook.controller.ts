import { Body, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';

import { LoggerService } from '../../common/logger/logger.service';
import { PrismaService } from '../../prisma/prisma.service';

import { CallState } from './telephony.types';
import { TwilioSignatureService } from './twilio-signature.service';
import { parseStatusCallback } from './twilio-webhook.dto';
import { TwilioAdapter, WebhookEventParams } from './twilio.adapter';
import { TWILIO_SIGNATURE_HEADER, TWILIO_STATUS_MAP, TWILIO_TERMINAL_STATUSES } from './twilio.types';

/**
 * Phase 5.2.3 — Twilio webhook controller.
 *
 * Receives Twilio status callback webhooks and bridges them
 * into the existing telephony event architecture via TwilioAdapter.ingestWebhookEvent().
 *
 * Security:
 * - No JWT auth — Twilio cannot authenticate with JWT.
 * - Signature verification via X-Twilio-Signature header and TWILIO_AUTH_TOKEN.
 * - When TWILIO_WEBHOOK_VERIFY=false, signature verification is skipped (dev/test only).
 * - No credentials are logged or exposed in responses.
 *
 * Idempotency:
 * - Duplicate webhooks for the same state are suppressed by lastEmittedStates in TwilioAdapter.
 * - The state machine in TelephonyService rejects invalid transitions.
 *
 * Call correlation:
 * - Twilio Call SID → CallSession.providerRef lookup in the database.
 * - Does NOT rely on in-memory callSidMap — works after process restart.
 */
@ApiTags('Webhooks')
@Controller('webhooks/twilio')
export class TwilioWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly twilioAdapter: TwilioAdapter,
    private readonly signatureService: TwilioSignatureService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Twilio status callback endpoint.
   *
   * Twilio sends POST requests with URL-encoded form data when call status changes.
   * We respond with 200 OK to acknowledge receipt. Twilio retries if it doesn't
   * receive a 200 within 15 seconds.
   *
   * For unknown Call SIDs (e.g., calls from a different system), we still
   * return 200 to stop Twilio retries — the call is simply not tracked by us.
   */
  @Post('status')
  @HttpCode(200)
  @SkipThrottle()
  async handleStatusCallback(
    @Body() body: Record<string, string>,
    @Headers() headers: Record<string, string | undefined>,
    @Req() req: Request,
  ): Promise<{ status: string }> {
    const config = this.twilioAdapter.getConfig();

    const signature = headers[TWILIO_SIGNATURE_HEADER] || headers['X-Twilio-Signature'];

    const webhookUrl = config.webhookUrl || this.buildUrlFromRequest(req);

    const isValid = this.signatureService.validateRequest(
      { authToken: config.authToken, webhookVerify: config.webhookVerify },
      signature,
      webhookUrl,
      body,
    );

    if (!isValid) {
      this.logger.warn('Twilio webhook signature verification failed', 'TwilioWebhookController', {
        callSid: body['CallSid'] || 'unknown',
      });
      return { status: 'rejected' };
    }

    let payload;
    try {
      payload = parseStatusCallback(body);
    } catch {
      this.logger.warn('Twilio webhook payload parsing failed', 'TwilioWebhookController', {
        callSid: body['CallSid'] || 'unknown',
      });
      return { status: 'ignored' };
    }

    const callSession = await this.prisma.callSession.findFirst({
      where: { providerRef: payload.callSid },
      select: { id: true, tenantId: true, agentId: true, state: true },
    });

    if (!callSession) {
      this.logger.debug('Twilio webhook for unknown CallSid — ignoring', 'TwilioWebhookController', {
        callSid: payload.callSid,
      });
      return { status: 'ignored' };
    }

    const mappedState = TWILIO_STATUS_MAP[payload.callStatus];
    if (!mappedState || mappedState === CallState.Queued) {
      return { status: 'skipped' };
    }

    if (callSession.state === mappedState) {
      return { status: 'duplicate' };
    }

    const isTerminal = TWILIO_TERMINAL_STATUSES.has(payload.callStatus);

    if (isTerminal) {
      const now = new Date();
      const updateData: Record<string, unknown> = { state: mappedState, completedAt: now, terminationReason: mappedState };
      if (mappedState === CallState.Completed && payload.callDuration) {
        updateData.duration = parseInt(payload.callDuration, 10) || undefined;
      }
      await this.prisma.callSession.update({
        where: { id: callSession.id },
        data: updateData,
      });

      if (mappedState === CallState.Completed && payload.callDuration) {
        const duration = parseInt(payload.callDuration, 10) || undefined;
        const attempt = await this.prisma.callSession.findFirst({
          where: { id: callSession.id },
          select: { attemptId: true },
        });
        if (attempt?.attemptId) {
          await this.prisma.leadAttempt.update({
            where: { id: attempt.attemptId },
            data: { outcome: mappedState, duration, endedAt: now, providerRef: payload.callSid },
          });
        }
      }

      await this.prisma.audit.create({
        data: {
          tenantId: callSession.tenantId,
          userId: callSession.agentId,
          action: `call.${mappedState}`,
          resource: 'CallSession',
          resourceId: callSession.id,
          metadata: { providerRef: payload.callSid, source: 'webhook' },
        },
      });

      this.logger.log('Twilio webhook processed terminal state', 'TwilioWebhookController', {
        tenantId: callSession.tenantId,
        agentId: callSession.agentId,
        callId: callSession.id,
        state: mappedState,
        callSid: payload.callSid,
      });
    }

    const webhookParams: WebhookEventParams = {
      callId: callSession.id,
      tenantId: callSession.tenantId,
      agentId: callSession.agentId,
      sid: payload.callSid,
      twilioStatus: payload.callStatus,
      duration: payload.callDuration ? parseInt(payload.callDuration, 10) : undefined,
    };

    const emitted = this.twilioAdapter.ingestWebhookEvent(webhookParams);

    return { status: emitted ? 'processed' : 'suppressed' };
  }

  private buildUrlFromRequest(req: Request): string {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost';
    return `${proto}://${host}${req.originalUrl}`;
  }
}
