package com.aiyal.mobibix.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

// FINALIZED for Phase-1
data class CreateShopRequest(
    val name: String,
    val phone: String,
    val addressLine1: String,
    val city: String,
    val state: String,
    val pincode: String,
    val invoicePrefix: String,
    val gstNumber: String?,
    val website: String?,
    val invoiceFooter: String?,
    val logoUrl: String? // Added to match backend DTO
)

data class Shop(
    val id: String,
    val name: String,
    val addressLine1: String? = null,
    val city: String? = null,
    val phone: String
)

// Wrapper to match backend's paginated response: {data: [], total:, skip:, take:}
data class PaginatedShopResponse(
    val data: List<Shop> = emptyList()
)

// Updated to include gstEnabled, gstNumber (matches backend field name exactly)
data class ShopDetails(
    val name: String,
    val address: String,
    val addressLine1: String? = null,  // Granular address — prefer over address
    val city: String? = null,
    val state: String? = null,         // Raw state string e.g. "Tamil Nadu" or "TN"
    val phone: String,
    val gstNumber: String?,            // Backend field is gstNumber NOT gstin — must match exactly
    val gstEnabled: Boolean,
    val invoiceFooter: String?,
    val terms: List<String>?,
    val logoUrl: String?
)

// Kept for backward compatibility
data class UpdateShopRequest(
    val name: String,
    val address: String,
    val phone: String,
    val gstNumber: String?,    // Backend field is gstNumber
    val invoiceFooter: String?,
    val terms: List<String>
)

// New request for the settings endpoint
data class UpdateShopSettingsRequest(
    val name: String,
    val address: String,
    val phone: String,
    val gstEnabled: Boolean,
    val gstNumber: String?,
    val invoiceFooter: String?,
    val terms: List<String>
)

interface ShopApi {
    @POST("api/mobileshop/shops")
    suspend fun createShop(@Body request: CreateShopRequest): Shop

    @GET("api/mobileshop/shops")
    suspend fun getMyShops(): PaginatedShopResponse

    @GET("api/mobileshop/shops/{shopId}")
    suspend fun getShop(@Path("shopId") shopId: String): ShopDetails

    @PATCH("api/mobileshop/shops/{shopId}")
    suspend fun updateShop(@Path("shopId") shopId: String, @Body request: UpdateShopRequest)

    // --- New Methods ---
    @GET("api/mobileshop/shops/{shopId}/settings")
    suspend fun getShopSettings(
        @Path("shopId") shopId: String
    ): ShopDetails

    @PATCH("api/mobileshop/shops/{shopId}/settings")
    suspend fun updateShopSettings(
        @Path("shopId") shopId: String,
        @Body request: UpdateShopSettingsRequest
    )
}
