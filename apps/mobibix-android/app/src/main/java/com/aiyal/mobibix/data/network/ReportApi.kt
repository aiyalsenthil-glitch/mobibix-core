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

    @GET("api/mobileshop/reports/gstr-1/b2b")
    suspend fun getTaxReport(
        @Query("shopId") shopId: String?,
        @Query("startDate") startDate: String?,
        @Query("endDate") endDate: String?
    ): List<TaxReportItem>

    @GET("api/mobileshop/reports/receivables-aging")
    suspend fun getReceivables(
        @Query("shopId") shopId: String?
    ): List<OutstandingItem>

    @GET("api/mobileshop/reports/payables-aging")
    suspend fun getPayables(
        @Query("shopId") shopId: String?
    ): List<OutstandingItem>

    @GET("api/mobileshop/reports/daily-sales")
    suspend fun getDailySales(
        @Query("shopId") shopId: String?,
        @Query("startDate") startDate: String?,
        @Query("endDate") endDate: String?
    ): List<DailySalesItem>
}

data class TaxReportItem(
    val date: String,
    val invoiceNo: String,
    val customerName: String?,
    val gstNo: String?,
    val taxableAmount: Double,
    val cgst: Double,
    val sgst: Double,
    val igst: Double,
    val totalTax: Double,
    val totalAmount: Double
)

data class OutstandingItem(
    val entityName: String, // Customer or Supplier Name
    val pendingAmount: Double,
    val lastTransactionDate: String?
)

data class DailySalesItem(
    val date: String,
    val totalOrders: Int,
    val totalSales: Double,
    val cashSales: Double,
    val onlineSales: Double
)
