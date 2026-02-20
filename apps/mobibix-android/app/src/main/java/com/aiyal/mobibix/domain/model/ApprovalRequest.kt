package com.aiyal.mobibix.domain.model

data class ApprovalRequest(
    val id: String,
    val actionType: String,
    val entityId: String?,
    val status: String,
    val createdAt: String,
    val requesterName: String,
    val requesterEmail: String
)
