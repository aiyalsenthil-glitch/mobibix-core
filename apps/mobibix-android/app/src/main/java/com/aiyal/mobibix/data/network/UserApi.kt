package com.aiyal.mobibix.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

data class UserMeResponse(
    val id: String,
    val role: String,
    val tenantId: String?,
    val isSystemOwner: Boolean? = false,
    val permissions: List<String>? = emptyList(),
    val inviteToken: String?,
    val isComingSoon: Boolean? = false,
    val isDistributor: Boolean? = false,
    val hasActiveERP: Boolean? = false
)

data class FcmTokenRequest(val token: String)

interface UserApi {
    @GET("api/users/me")
    suspend fun me(): UserMeResponse

    @POST("api/users/fcm-token")
    suspend fun registerFcmToken(@Body request: FcmTokenRequest)
}
