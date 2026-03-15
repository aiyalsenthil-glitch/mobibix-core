package com.aiyal.mobibix.domain.repository

import com.aiyal.mobibix.domain.model.ApprovalRequest

interface ApprovalRepository {
    suspend fun listPendingApprovals(): List<ApprovalRequest>
    suspend fun resolveApproval(id: String, approved: Boolean, comment: String? = null)
}
