package com.aiyal.mobibix.data.network

import retrofit2.http.*

// ─── Models ──────────────────────────────────────────────────────────────────

data class TradeIn(
    val id: String,
    val tradeInNumber: String,
    val customerName: String,
    val customerPhone: String,
    val deviceBrand: String,
    val deviceModel: String,
    val deviceImei: String? = null,
    val deviceStorage: String? = null,
    val conditionGrade: String,
    val marketValue: Double = 0.0,
    val offeredValue: Double = 0.0,
    val status: String,
    val notes: String? = null,
    val createdAt: String = ""
)

data class CreateTradeInRequest(
    val shopId: String,
    val customerName: String,
    val customerPhone: String,
    val deviceBrand: String,
    val deviceModel: String,
    val deviceImei: String? = null,
    val deviceStorage: String? = null,
    val conditionGrade: String,
    val marketValue: Double,
    val offeredValue: Double,
    val conditionChecks: Map<String, Boolean> = emptyMap(),
    val notes: String? = null
)

data class UpdateTradeInStatusRequest(val status: String)

// ─── API ─────────────────────────────────────────────────────────────────────

interface TradeInApi {
    @GET("api/trade-in")
    suspend fun getTradeIns(
        @Query("shopId") shopId: String,
        @Query("status") status: String? = null
    ): List<TradeIn>

    @POST("api/trade-in")
    suspend fun createTradeIn(@Body request: CreateTradeInRequest): TradeIn

    @GET("api/trade-in/{id}")
    suspend fun getTradeIn(@Path("id") id: String): TradeIn

    @PATCH("api/trade-in/{id}/status")
    suspend fun updateStatus(
        @Path("id") id: String,
        @Body request: UpdateTradeInStatusRequest
    ): TradeIn
}
