package com.aiyal.mobibix.data.network

import retrofit2.http.*

data class InviteStaffRequest(
    val email: String,
    val role: String, // Should always be STAFF
    val shopId: String
)

data class AcceptInviteRequest(
    val inviteToken: String
)

data class AcceptInviteResponse(
    val accessToken: String
)

data class StaffResponse(
    val id: String,
    val email: String,
    val fullName: String?,
    val phone: String?,
    val role: String,
    val createdAt: String
)

data class InviteResponse(
    val id: String,
    val email: String,
    val name: String?,
    val phone: String?,
    val role: String,
    val createdAt: String
)

interface StaffApi {
    @POST("api/mobileshop/staff/invite")
    suspend fun invite(
        @Body body: InviteStaffRequest
    )

    @POST("api/mobileshop/staff/accept")
    suspend fun acceptInvite(
        @Body body: AcceptInviteRequest
    ): AcceptInviteResponse

    @GET("api/mobileshop/staff")
    suspend fun getStaff(): List<StaffResponse>

    @GET("api/mobileshop/staff/invites")
    suspend fun getInvites(): List<InviteResponse>

    @DELETE("api/mobileshop/staff/{id}")
    suspend fun removeStaff(@Path("id") id: String)

    @DELETE("api/mobileshop/staff/invite/{id}")
    suspend fun revokeInvite(@Path("id") id: String)
}
