package com.aiyal.mobibix.data.network

import retrofit2.http.GET
import retrofit2.http.Query

data class SalesReportItem(
    val invoiceNo: String,
    val date: String,
    val customer: String?,
    val totalAmount: Double,
    val paidAmount: Double,
    val pendingAmount: Double,
    val paymentMode: String,
    val profit: Double?,
    val shopName: String? = null
)

data class InventoryReportItem(
    val product: String,
    val isSerialized: Boolean,
    val quantity: Int,
    val costPrice: Double,
    val stockValue: Double?,
    val lowStock: Boolean
)

data class ProfitSummaryMetrics(
    val totalRevenue: Double,
    val totalCost: Double,
    val grossProfit: Double,
    val margin: Double,
    val salesRevenue: Double,
    val salesCost: Double,
    val salesProfit: Double,
    val repairRevenue: Double,
    val repairCost: Double,
    val repairProfit: Double
)

data class ProfitSummaryResponse(
    val metrics: ProfitSummaryMetrics
)

interface ReportApi {
    @GET("api/mobileshop/reports/sales")
    suspend fun getSalesReport(
        @Query("shopId") shopId: String?,
        @Query("startDate") startDate: String?,
        @Query("endDate") endDate: String?
    ): List<SalesReportItem>

    @GET("api/mobileshop/reports/repairs")
    suspend fun getRepairReport(
        @Query("shopId") shopId: String?,
        @Query("startDate") startDate: String?,
        @Query("endDate") endDate: String?
    ): List<SalesReportItem>

    @GET("api/mobileshop/reports/inventory")
    suspend fun getInventoryReport(
        @Query("shopId") shopId: String?
    ): List<InventoryReportItem>

    @GET("api/mobileshop/reports/profit")
    suspend fun getProfitSummary(
        @Query("shopId") shopId: String?,
        @Query("startDate") startDate: String?,
        @Query("endDate") endDate: String?
    ): ProfitSummaryResponse
}
