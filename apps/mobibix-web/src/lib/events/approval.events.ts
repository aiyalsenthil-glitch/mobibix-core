export class ApprovalRequiredError extends Error {
  public code = "APPROVAL_REQUIRED";
  public action: string;
  public metadata?: Record<string, any>;

  constructor(action: string, metadata?: Record<string, any>) {
    super(`Manager approval required for action: ${action}`);
    this.name = "ApprovalRequiredError";
    this.action = action;
    this.metadata = metadata;
  }
}

// Global Event Bus for intercepting 403 Approvals
export const approvalEventTarget = new EventTarget();

export function dispatchApprovalRequired(action: string, params?: any, resolve?: () => void, reject?: (err: any) => void) {
  const event = new CustomEvent("approval_required", {
    detail: { action, params, resolve, reject }
  });
  approvalEventTarget.dispatchEvent(event);
}
