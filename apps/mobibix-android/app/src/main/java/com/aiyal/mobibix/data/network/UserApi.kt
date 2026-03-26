package com.aiyal.mobibix.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

data class UserMeResponse(
    val id: String,
    val role: String,      // Dynamic role name
    val tenantId: String?,  // null or uuid
    val isSystemOwner: Boolean? = false,
    val permissions: List<String>? = emptyList(),
    val inviteToken: String?, // Present if user is invited but has not accepted
    val isComingSoon: Boolean? = false
)

data class FcmTokenRequest(val token: String)

interface UserApi {
    @GET("api/users/me")
    suspend fun me(): UserMeResponse

    @POST("api/users/fcm-token")
    suspend fun registerFcmToken(@Body request: FcmTokenRequest)
}
