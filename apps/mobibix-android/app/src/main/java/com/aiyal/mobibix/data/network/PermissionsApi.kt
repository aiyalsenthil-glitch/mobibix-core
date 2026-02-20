package com.aiyal.mobibix.data.network

import com.aiyal.mobibix.data.network.dto.*
import retrofit2.http.*

interface PermissionsApi {

    // --- Roles ---
    @GET("permissions/roles")
    suspend fun listRoles(): List<PermissionRoleResponse>

    @GET("permissions/roles/{id}")
    suspend fun getRole(@Path("id") id: String): PermissionRoleResponse

    @POST("permissions/roles")
    suspend fun createRole(@Body request: CreateRoleRequest): PermissionRoleResponse

    @PATCH("permissions/roles/{id}")
    suspend fun updateRole(@Path("id") id: String, @Body request: UpdateRoleRequest): PermissionRoleResponse

    @DELETE("permissions/roles/{id}")
    suspend fun deleteRole(@Path("id") id: String)

    // --- Approvals ---
    @GET("permissions/approvals/pending")
    suspend fun listPendingApprovals(): List<ApprovalRequestResponse>

    @POST("permissions/approvals/{id}/resolve")
    suspend fun resolveApproval(@Path("id") id: String, @Body request: ResolveApprovalRequest)
}
