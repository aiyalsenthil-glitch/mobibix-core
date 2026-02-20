package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.PermissionsApi
import com.aiyal.mobibix.data.network.dto.ResolveApprovalRequest
import com.aiyal.mobibix.domain.model.ApprovalRequest
import com.aiyal.mobibix.domain.repository.ApprovalRepository
import javax.inject.Inject

class ApprovalRepositoryImpl @Inject constructor(
    private val api: PermissionsApi
) : ApprovalRepository {

    override suspend fun listPendingApprovals(): List<ApprovalRequest> {
        return api.listPendingApprovals().map { resp ->
            ApprovalRequest(
                id = resp.id,
                actionType = resp.actionType,
                entityId = resp.entityId,
                status = resp.status,
                createdAt = resp.createdAt,
                requesterName = resp.requester.fullName ?: "Unknown Staff",
                requesterEmail = resp.requester.email ?: ""
            )
        }
    }

    override suspend fun resolveApproval(id: String, approved: Boolean, comment: String?) {
        api.resolveApproval(
            id = id,
            request = ResolveApprovalRequest(
                status = if (approved) "APPROVED" else "REJECTED",
                comment = comment
            )
        )
    }
}
