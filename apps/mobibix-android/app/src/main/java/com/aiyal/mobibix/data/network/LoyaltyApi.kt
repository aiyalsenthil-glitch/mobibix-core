package com.aiyal.mobibix.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

data class LoyaltySummary(
    val totalCustomers: Int = 0,
    val totalPointsIssued: Int = 0,
    val totalPointsRedeemed: Int = 0
)

data class LoyaltyHistoryItem(
    val id: String,
    val customerName: String,
    val date: String,
    val type: String, // EARNED, REDEEMED
    val points: Int,
    val description: String?
)

data class LoyaltyTransaction(
    val id: String,
    val customerId: String? = null,
    val customerName: String? = null,
    val type: String = "",
    val points: Int = 0,
    val description: String? = null,
    val createdAt: String? = null
)

data class TransactionsResponse(
    val transactions: List<LoyaltyTransaction> = emptyList()
)

data class ManualAdjustmentRequest(
    val customerId: String,
    val points: Int,
    val reason: String,
    val shopId: String? = null
)

// Keep for backward compat but now maps to manual-adjustment
data class AddPointsRequest(
    val shopId: String,
    val customerId: String,
    val points: Int,
    val description: String?
)

data class RedeemPointsRequest(
    val shopId: String,
    val customerId: String,
    val points: Int,
    val description: String?
)

data class LoyaltyConfig(
    val tenantId: String? = null,
    val isEnabled: Boolean = false,
    val earnAmountPerPoint: Int = 100,
    val pointsPerEarnUnit: Int = 1,
    val pointValueInRupees: Double = 1.0,
    val maxRedeemPercent: Int = 20,
    val allowOnRepairs: Boolean = true,
    val allowOnAccessories: Boolean = true,
    val allowOnServices: Boolean = true,
    val expiryDays: Int? = null,
    val allowManualAdjustment: Boolean = true,
    val minInvoiceForEarn: Int? = null
)

data class UpdateLoyaltyConfigResponse(
    val success: Boolean = true,
    val config: LoyaltyConfig? = null
)

interface LoyaltyApi {
    @GET("api/loyalty/summary")
    suspend fun getLoyaltySummary(@Query("shopId") shopId: String): LoyaltySummary

    // Returns all tenant transactions (optional shopId filter)
    @GET("api/loyalty/transactions")
    suspend fun getTransactions(@Query("shopId") shopId: String? = null): TransactionsResponse

    // Manual adjustment — used for add/subtract points
    @POST("api/loyalty/manual-adjustment")
    suspend fun manualAdjustment(@Body request: ManualAdjustmentRequest): ResponseStatus

    @GET("api/loyalty/config")
    suspend fun getLoyaltyConfig(): LoyaltyConfig

    @PUT("api/loyalty/config")
    suspend fun updateLoyaltyConfig(@Body config: LoyaltyConfig): UpdateLoyaltyConfigResponse
}

data class ResponseStatus(
    val success: Boolean,
    val message: String?
)
