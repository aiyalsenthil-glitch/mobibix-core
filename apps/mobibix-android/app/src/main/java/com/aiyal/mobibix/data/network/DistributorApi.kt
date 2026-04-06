package com.aiyal.mobibix.data.network

import retrofit2.http.*

// ─── Models ──────────────────────────────────────────────────────────────────

data class DistributorAnalytics(
    val activeRetailers: Int = 0,
    val totalOrders: Int = 0,
    val monthlyRevenue: Double = 0.0,
    val unitsSold: Int = 0,
    val pendingOrders: Int = 0
)

data class DistributorProduct(
    val id: String,
    val name: String,
    val brand: String? = null,
    val category: String? = null,
    val salePrice: Int = 0,
    val stockQty: Int = 0,
    val unitsSold: Int = 0
)

data class DistributorOrder(
    val id: String,
    val retailerName: String,
    val status: String,  // PENDING | CONFIRMED | SHIPPED | DELIVERED | CANCELLED
    val totalAmount: Int,
    val createdAt: String,
    val itemCount: Int = 0
)

data class DistributorRetailer(
    val id: String,
    val businessName: String,
    val phone: String?,
    val city: String?,
    val creditBalance: Double = 0.0,
    val totalOrders: Int = 0,
    val lastOrderAt: String? = null
)

data class DistributorRegisterRequest(
    val name: String,
    val referralCode: String
)

data class DistributorProfile(
    val id: String,
    val name: String,
    val referralCode: String,
    val isActive: Boolean = true,
    val totalReferrals: Int = 0,
    val pendingEarnings: Double = 0.0,
    val totalEarnings: Double = 0.0
)

data class UpdateOrderStatusRequest(val status: String)

// ─── API ─────────────────────────────────────────────────────────────────────

interface DistributorApi {

    @GET("api/distributor/analytics/overview")
    suspend fun getAnalytics(): DistributorAnalytics

    @GET("api/distributor/catalog")
    suspend fun getCatalog(): List<DistributorProduct>

    @GET("api/distributor/orders")
    suspend fun getOrders(
        @Query("status") status: String? = null,
        @Query("page") page: Int = 1
    ): List<DistributorOrder>

    @PUT("api/distributor/orders/{orderId}/status")
    suspend fun updateOrderStatus(
        @Path("orderId") orderId: String,
        @Body request: UpdateOrderStatusRequest
    ): DistributorOrder

    @GET("api/distributor/analytics/retailers")
    suspend fun getRetailers(): List<DistributorRetailer>

    @GET("api/distributor/profile")
    suspend fun getProfile(): DistributorProfile

    @POST("api/distributor/register")
    suspend fun register(@Body request: DistributorRegisterRequest): DistributorProfile
}
