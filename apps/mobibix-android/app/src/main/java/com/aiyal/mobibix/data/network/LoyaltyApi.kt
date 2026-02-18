package com.aiyal.mobibix.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

data class LoyaltySummary(
    val totalCustomers: Int,
    val totalPointsIssued: Int,
    val totalPointsRedeemed: Int
)

data class LoyaltyHistoryItem(
    val id: String,
    val customerName: String,
    val date: String,
    val type: String, // EARNED, REDEEMED
    val points: Int,
    val description: String?
)

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

interface LoyaltyApi {
    @GET("api/loyalty/summary")
    suspend fun getLoyaltySummary(@Query("shopId") shopId: String): LoyaltySummary

    @GET("api/loyalty/history")
    suspend fun getLoyaltyHistory(@Query("shopId") shopId: String): List<LoyaltyHistoryItem>

    @POST("api/loyalty/add")
    suspend fun addPoints(@Body request: AddPointsRequest): ResponseStatus

    @POST("api/loyalty/redeem")
    suspend fun redeemPoints(@Body request: RedeemPointsRequest): ResponseStatus
}

data class ResponseStatus(
    val success: Boolean,
    val message: String?
)
