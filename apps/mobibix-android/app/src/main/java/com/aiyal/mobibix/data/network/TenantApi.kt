package com.aiyal.mobibix.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

data class BusinessCategory(
    val id: String,
    val name: String,
    val description: String?,
    val isComingSoon: Boolean
)

data class CreateTenantRequest(
    val name: String,
    val tenantType: String = "MOBILE_SHOP",
    val businessType: String? = null,
    val businessCategoryId: String? = null,
    val legalName: String? = null,
    val contactPhone: String? = null,
    val addressLine1: String? = null,
    val city: String? = null,
    val state: String? = null,
    val pincode: String? = null,
    val gstNumber: String? = null,
    val currency: String? = null,
    val timezone: String? = null,
    val marketingConsent: Boolean? = null,
    val acceptedPolicyVersion: String? = null,
    val promoCode: String? = null
)

data class CreateTenantResponse(
    val accessToken: String
)

data class RequestDeletionRequest(
    val acknowledged: Boolean,
    val reason: String? = null
)

interface TenantApi {
    @POST("api/tenant")
    suspend fun createTenant(
        @Body body: CreateTenantRequest
    ): CreateTenantResponse

    @GET("api/platform/business-categories")
    suspend fun getBusinessCategories(): List<BusinessCategory>

    @POST("api/tenant/request-deletion")
    suspend fun requestDeletion(
        @Body body: RequestDeletionRequest
    )
}