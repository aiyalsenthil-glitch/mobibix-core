import { Injectable, BadRequestException } from '@nestjs/common';
import { JobStatus } from '@prisma/client';

/**
 * ────────────────────────────────────────────────
 * JOB STATUS TRANSITION VALIDATOR
 * ────────────────────────────────────────────────
 *
 * Enforces valid state transitions for JobCard lifecycle.
 *
 * TERMINAL STATES (no transitions allowed):
 * - DELIVERED
 * - CANCELLED
 * - RETURNED
 *
 * CRITICAL STATUS:
 * - READY: Triggers auto-invoice creation and WhatsApp
 */
@Injectable()
export class JobStatusValidator {
  /**
   * Valid state transition matrix
   * Key = current status, Value = allowed next statuses
   */
  private readonly VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
    // Initial state - can assign, diagnose, or cancel
    [JobStatus.RECEIVED]: [
      JobStatus.ASSIGNED,
      JobStatus.DIAGNOSING,
      JobStatus.CANCELLED,
    ],

    // Assigned - can start diagnosis or cancel
    [JobStatus.ASSIGNED]: [JobStatus.DIAGNOSING, JobStatus.CANCELLED],

    // Diagnosing - can go to approval, skip to repair, or cancel
    [JobStatus.DIAGNOSING]: [
      JobStatus.WAITING_APPROVAL,
      JobStatus.IN_PROGRESS, // Skip approval if minor repair
      JobStatus.CANCELLED,
    ],

    // Waiting for customer approval - can be approved, re-diagnosed, or cancelled
    [JobStatus.WAITING_APPROVAL]: [
      JobStatus.APPROVED,
      JobStatus.DIAGNOSING, // Re-diagnose if customer rejects
      JobStatus.CANCELLED,
    ],

    // Customer approved - can wait for parts, start repair, or cancel
    [JobStatus.APPROVED]: [
      JobStatus.WAITING_FOR_PARTS,
      JobStatus.IN_PROGRESS,
      JobStatus.CANCELLED,
    ],

    // Waiting for parts - can start repair or cancel
    [JobStatus.WAITING_FOR_PARTS]: [JobStatus.IN_PROGRESS, JobStatus.CANCELLED],

    // Repair in progress - can finish, pause for parts, or cancel
    [JobStatus.IN_PROGRESS]: [
      JobStatus.READY, // 🚨 CRITICAL: Triggers invoice + WhatsApp
      JobStatus.WAITING_FOR_PARTS,
      JobStatus.CANCELLED,
      JobStatus.SCRAPPED,
    ],

    // Ready for pickup - can deliver, return, or re-repair
    [JobStatus.READY]: [
      JobStatus.DELIVERED, // Terminal
      JobStatus.RETURNED, // Terminal
      JobStatus.SCRAPPED, // Terminal
      JobStatus.IN_PROGRESS, // Re-repair if issue found
    ],

    // Terminal state - no further transitions
    [JobStatus.DELIVERED]: [],

    // Cancelled - Can Reopen to resume work
    [JobStatus.CANCELLED]: [
      JobStatus.RECEIVED,
      JobStatus.DIAGNOSING,
      JobStatus.IN_PROGRESS,
    ],

    // Terminal state - no further transitions
    [JobStatus.RETURNED]: [],
    
    // Terminal state - no further transitions
    [JobStatus.SCRAPPED]: [],
  };

  /**
   * Validate if a status transition is allowed
   * @throws BadRequestException if transition is invalid
   */
  validateTransition(from: JobStatus, to: JobStatus): void {
    // Check if current status is terminal
    if (this.isTerminalState(from)) {
      throw new BadRequestException(
        `Cannot change status of ${from.toLowerCase()} job`,
      );
    }

    // Check if transition is allowed
    const allowedTransitions = this.VALID_TRANSITIONS[from] || [];
    if (!allowedTransitions.includes(to)) {
      throw new BadRequestException(
        `Invalid status transition from ${from} to ${to}. ` +
          `Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`,
      );
    }
  }

  /**
   * Check if a status is terminal (no further changes allowed)
   */
  isTerminalState(status: JobStatus): boolean {
    const terminalStates: JobStatus[] = [
      JobStatus.DELIVERED,
      // JobStatus.CANCELLED, // ALLOW REOPENING
      JobStatus.RETURNED,
      JobStatus.SCRAPPED,
    ];
    return terminalStates.includes(status);
  }

  /**
   * Check if a status should trigger WhatsApp notification
   * CRITICAL: Only READY status triggers customer WhatsApp
   */
  shouldTriggerWhatsApp(status: JobStatus): boolean {
    // Only customer-facing statuses trigger WhatsApp
    const customerFacingStatuses: JobStatus[] = [
      JobStatus.READY, // "Your device is ready for pickup"
      JobStatus.DELIVERED, // "Thank you for choosing us"
      JobStatus.CANCELLED, // "Your job has been cancelled"
    ];
    return customerFacingStatuses.includes(status);
  }

  /**
   * Check if a status should trigger auto-invoice creation
   * ERP-Correct: Auto-invoice disabled in favor of Interactive Billing Modal
   */
  shouldCreateInvoice(status: JobStatus): boolean {
    return false;
  }

  /**
   * Check if a status requires invoice voiding
   */
  shouldVoidInvoice(status: JobStatus): boolean {
    const voidableStatuses: JobStatus[] = [
      JobStatus.CANCELLED,
      JobStatus.RETURNED,
      JobStatus.SCRAPPED,
    ];
    return voidableStatuses.includes(status);
  }

  /**
   * Get all valid next statuses for a given status
   */
  getValidNextStatuses(from: JobStatus): JobStatus[] {
    return this.VALID_TRANSITIONS[from] || [];
  }
}
