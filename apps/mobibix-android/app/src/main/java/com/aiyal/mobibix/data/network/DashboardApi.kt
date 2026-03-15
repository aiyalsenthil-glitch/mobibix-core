package com.aiyal.mobibix.data.network

import retrofit2.http.GET
import retrofit2.http.Query

// --- Owner Dashboard API Response ---

data class OwnerDashboardResponse(
    val today: SalesAndJobs,
    val month: SalesAndJobs,
    val inventory: InventoryStats,
    val repairs: RepairStats,
    val paymentStats: List<PaymentStat>,
    val salesTrend: List<SalesTrend>
)

data class PaymentStat(
    val name: String,
    val value: Double
)

data class SalesTrend(
    val date: String,
    val sales: Double
)

data class SalesAndJobs(
    val salesAmount: Double,
    val jobsReceived: Int,
    val invoiceCount: Int
)

data class InventoryStats(
    val totalProducts: Int,
    val negativeStockCount: Int,
    val deadStockCount: Int
)

data class RepairStats(
    val inProgress: Int,
    val waitingForParts: Int,
    val ready: Int,
    val deliveredToday: Int
)


// --- Staff Dashboard API Response ---

data class StaffDashboardResponse(
    val jobs: RepairStats, // Reusing RepairStats
    val stockAlerts: StockAlerts
)

data class StockAlerts(
    val negativeStockCount: Int,
    val zeroStockCount: Int
)


// --- API Interface ---

interface DashboardApi {
    @GET("api/mobileshop/dashboard/owner")
    suspend fun getOwnerDashboard(@Query("shopId") shopId: String? = null): OwnerDashboardResponse

    @GET("api/mobileshop/dashboard/staff")
    suspend fun getStaffDashboard(): StaffDashboardResponse
}
