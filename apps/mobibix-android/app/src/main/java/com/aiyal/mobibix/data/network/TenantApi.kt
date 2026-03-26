package com.aiyal.mobibix.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

data class BusinessCategory(
    val id: String,
    val name: String,
    val description: String?,
    val isComingSoon: Boolean
)

/**
 * Mirrors GET /api/config/countries response.
 * Used to dynamically populate the country selector during onboarding.
 */
data class CountryOption(
    val code: String,          // ISO 3166-1 alpha-2 (e.g. "IN")
    val name: String,          // Display name (e.g. "India")
    val currency: String,      // ISO 4217 (e.g. "INR")
    val currencySymbol: String,// e.g. "₹"
    val phonePrefix: String,   // e.g. "+91"
    val taxSystem: String,     // "GST" | "VAT" | "SST" | "NONE"
    val timezone: String,      // IANA (e.g. "Asia/Kolkata")
    val hasGstField: Boolean   // Show GSTIN field in onboarding
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
    val promoCode: String? = null,
    val country: String? = null
)

data class CreateTenantResponse(
    val accessToken: String
)

data class RequestDeletionRequest(
    val acknowledged: Boolean,
    val reason: String? = null
)

data class PromoPreview(
    val valid: Boolean,
    val reason: String?,
    val type: String?,
    val benefit: String?,
    val badge: String?,
    val distributorName: String?,
    val partnerName: String?
)

interface TenantApi {
    @POST("api/tenant")
    suspend fun createTenant(
        @Body body: CreateTenantRequest
    ): CreateTenantResponse

    @GET("api/platform/business-categories")
    suspend fun getBusinessCategories(): List<BusinessCategory>

    /** Fetch country config for the onboarding country selector */
    @GET("api/config/countries")
    suspend fun getCountries(): List<CountryOption>

    @GET("api/partners/promo/preview")
    suspend fun previewPromoCode(@Query("code") code: String): PromoPreview

    @POST("api/tenant/request-deletion")
    suspend fun requestDeletion(
        @Body body: RequestDeletionRequest
    )
}