import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PermissionService } from './permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleType } from '@prisma/client';

export interface DispatchContext {
  userId: string;
  tenantId: string;
  shopId: string;
  moduleType: ModuleType;
  resource: string;
  action: string;
  entityId?: string;
  payload?: any;
}

@Injectable()
export class ActionDispatcherService {
  private readonly logger = new Logger(ActionDispatcherService.name);

  constructor(
    private readonly permissions: PermissionService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Dispatches an action logically. If the user has direct access, runs executeAction.
   * If an ApprovalPolicy requires manager approval, it logs a PENDING request instead.
   * Otherwise, throws ForbiddenException.
   */
  async dispatch(
    context: DispatchContext,
    executeAction: () => Promise<any>,
  ): Promise<any> {
    const { userId, tenantId, shopId, moduleType, resource, action } = context;

    // 1. Can they execute directly?
    const hasDirectAccess = await this.permissions.hasPermission(
      userId,
      tenantId,
      shopId,
      moduleType,
      resource,
      action,
    );
    if (hasDirectAccess) {
      return await executeAction();
    }

    // 2. Check if there's an approval policy
    const policy: any = await this.permissions.getApprovalPolicy(
      resource,
      action,
      moduleType,
    );
    if (!policy || !policy.requiredPermission) {
      // Hard stop, no approval flow defined for this action
      throw new ForbiddenException(
        `You do not have permission to perform ${resource}.${action}`,
      );
    }

    // 3. Instead of executing, create an ApprovalRequest
    const req = await this.prisma.approvalRequest.create({
      data: {
        tenantId,
        shopId,
        requestedBy: userId,
        actionType: `${resource}.${action}`,
        entityId: context.entityId,
        structuredData: context.payload || {},
        status: 'PENDING',
      },
    });

    this.logger.log(
      `Created ApprovalRequest ${req.id} for ${resource}.${action}`,
    );
    return {
      requiresApproval: true,
      approvalRequestId: req.id,
      message:
        'This action requires manager approval. A request has been created.',
    };
  }

  /**
   * Resolves an approval request (APPROVE/REJECT).
   * Note: The actual execution of the "approved" action logic usually happens
   * in the specific service that received the approved callback or a generic job processor.
   */
  async resolveRequest(
    requestId: string,
    resolvedBy: string,
    status: 'APPROVED' | 'REJECTED',
    comment?: string,
  ) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Approval request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Approval request is already resolved');
    }

    // Update the request status
    return this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status,
        resolvedBy,
        ownerComment: comment,
      },
    });
  }
}
