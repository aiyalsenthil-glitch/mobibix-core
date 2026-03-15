package com.aiyal.mobibix.ui.features.home

// --- UI State for Dashboards ---

data class OwnerDashboardState(
    val loading: Boolean = true,
    val todaySales: Double = 0.0,
    val jobsReceived: Int = 0,
    val monthSales: Double = 0.0,
    val invoiceCount: Int = 0,
    val totalProducts: Int = 0,
    val negativeStock: Int = 0,
    val deadStock: Int = 0,
    val inProgress: Int = 0,
    val waitingParts: Int = 0,
    val ready: Int = 0,
    val deliveredToday: Int = 0,
    val percentageChange: Double = 0.0,
    val paymentStats: List<DashboardChartItem> = emptyList(),
    val salesTrend: List<DashboardTrendItem> = emptyList(),
    val shops: List<com.aiyal.mobibix.data.network.Shop> = emptyList(),
    val selectedShopId: String? = null
)

data class DashboardChartItem(
    val name: String,
    val value: Double
)

data class DashboardTrendItem(
    val date: String,
    val sales: Double
)

data class StaffDashboardState(
    val loading: Boolean = true,
    val inProgress: Int = 0,
    val waitingParts: Int = 0,
    val ready: Int = 0,
    val deliveredToday: Int = 0,
    val negativeStock: Int = 0,
    val zeroStock: Int = 0
)
