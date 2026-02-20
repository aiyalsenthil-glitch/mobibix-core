package com.aiyal.mobibix.data.network.dto

import com.aiyal.mobibix.domain.model.Role
import com.google.gson.annotations.SerializedName

data class PermissionRoleResponse(
    val id: String,
    val name: String,
    val description: String?,
    val isSystem: Boolean,
    val permissions: List<String>? = null
) {
    fun toDomain(): Role = Role(
        id = id,
        name = name,
        isSystem = isSystem,
        description = description ?: "",
        permissions = permissions ?: emptyList()
    )
}

data class CreateRoleRequest(
    val name: String,
    val description: String,
    val permissions: List<String>
)

data class UpdateRoleRequest(
    val name: String?,
    val description: String?,
    val permissions: List<String>?
)

data class ApprovalRequestResponse(
    val id: String,
    val actionType: String,
    val entityId: String?,
    val status: String,
    val createdAt: String,
    val requester: RequesterDto
)

data class RequesterDto(
    val fullName: String?,
    val email: String?
)

data class ResolveApprovalRequest(
    val status: String, // APPROVED | REJECTED
    val comment: String?
)
