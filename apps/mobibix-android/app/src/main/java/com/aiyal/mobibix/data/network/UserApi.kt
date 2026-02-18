package com.aiyal.mobibix.data.network

import retrofit2.http.GET

data class UserMeResponse(
    val id: String,
    val role: String,      // OWNER | STAFF | USER
    val tenantId: String?,  // null or uuid
    val inviteToken: String? // Present if user is invited but has not accepted
)

interface UserApi {
    @GET("api/users/me")
    suspend fun me(): UserMeResponse
}
