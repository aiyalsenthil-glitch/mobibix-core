package com.aiyal.mobibix.data.network

import retrofit2.http.*

data class ForecastItem(
    val productId: String,
    val productName: String,
    val currentStock: Int,
    val avgDailySales: Double,
    val forecastedDemand: Int,
    val recommendedReorder: Int,
    val daysUntilStockout: Int?,
    val confidence: Double,
    val trend: String
)

data class DemandForecastResponse(
    val shopId: String,
    val generatedAt: String,
    val forecastPeriodDays: Int,
    val items: List<ForecastItem>,
    val lowStockCount: Int,
    val criticalStockCount: Int
)

interface DemandForecastApi {
    @GET("api/mobileshop/shops/{shopId}/demand-forecast")
    suspend fun getDemandForecast(
        @Path("shopId") shopId: String,
        @Query("days") days: Int? = null,
        @Query("categoryId") categoryId: String? = null
    ): DemandForecastResponse
}
