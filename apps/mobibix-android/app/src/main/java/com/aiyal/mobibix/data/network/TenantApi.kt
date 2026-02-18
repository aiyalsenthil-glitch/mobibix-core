package com.aiyal.mobibix.data.network

import retrofit2.http.Body
import retrofit2.http.POST

data class CreateTenantRequest(
    val name: String,
    val tenantType: String = "MOBILE_SHOP"
)

data class CreateTenantResponse(
    val accessToken: String
)

interface TenantApi {
    @POST("api/tenant")
    suspend fun createTenant(
        @Body body: CreateTenantRequest
    ): CreateTenantResponse
}