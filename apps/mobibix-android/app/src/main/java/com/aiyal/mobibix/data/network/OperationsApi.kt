package com.aiyal.mobibix.data.network

import retrofit2.http.*

// ─── Expense Models ───────────────────────────────────────────────────────────

data class ExpenseCategory(
    val id: String,
    val name: String,
    val isDefault: Boolean = false
)

data class Expense(
    val id: String,
    val shopId: String,
    val categoryId: String? = null,
    val categoryName: String? = null,
    val amount: Double,
    val description: String,
    val paymentMode: String,
    val date: String,
    val staffName: String? = null,
    val createdAt: String? = null
)

data class ExpenseCategoryBreakdown(
    val categoryName: String,
    val total: Double,
    val count: Int,
    val percent: Double
)

data class CreateExpenseDto(
    val shopId: String,
    val categoryId: String? = null,
    val amount: Int, // integer Rupees — backend converts to Paisa
    val paymentMethod: String = "CASH",
    val note: String? = null,
    val date: String? = null
)

data class ExpenseListResponse(val data: List<Expense> = emptyList(), val total: Double = 0.0)
data class CategoryBreakdownResponse(val data: List<ExpenseCategoryBreakdown> = emptyList())

// ─── Daily Closing Models ─────────────────────────────────────────────────────

data class DailySummary(
    val date: String,
    val shopId: String,
    val status: String = "OPEN",
    val openingCash: Double = 0.0,
    val salesCash: Double = 0.0,
    val salesUpi: Double = 0.0,
    val salesCard: Double = 0.0,
    val salesBank: Double = 0.0,
    val cashWithdrawFromBank: Double = 0.0,
    val cashDepositToBank: Double = 0.0,
    val otherCashIn: Double = 0.0,
    val otherCashOut: Double = 0.0,
    val totalIn: Double = 0.0,
    val totalOut: Double = 0.0,
    val supplierPaymentsCash: Double = 0.0,
    val expenseCash: Double = 0.0,
    val expectedClosingCash: Double = 0.0,
    val reportedClosingCash: Double = 0.0,
    val cashDifference: Double = 0.0
)

data class DailyClosing(
    val id: String,
    val shopId: String,
    val date: String,
    val status: String,
    val openingCash: Double = 0.0,
    val salesCash: Double = 0.0,
    val salesUpi: Double = 0.0,
    val salesCard: Double = 0.0,
    val salesBank: Double = 0.0,
    val expectedClosingCash: Double = 0.0,
    val reportedClosingCash: Double = 0.0,
    val cashDifference: Double = 0.0,
    val varianceReason: String? = null,
    val varianceNote: String? = null,
    val closedAt: String? = null,
    val createdAt: String? = null
)

data class DailyClosingManualEntries(
    val salesCash: Double? = null,
    val salesUpi: Double? = null,
    val salesCard: Double? = null,
    val salesBank: Double? = null,
    val otherCashIn: Double? = null,
    val cashWithdrawFromBank: Double? = null,
    val expenseCash: Double? = null,
    val supplierPaymentsCash: Double? = null,
    val otherCashOut: Double? = null,
    val cashDepositToBank: Double? = null
)

data class SubmitDailyClosingDto(
    val shopId: String,
    val date: String,
    val mode: String = "SYSTEM", // SYSTEM or MANUAL
    val reportedClosingCash: Double,
    val manualEntries: DailyClosingManualEntries? = null,
    val varianceReason: String? = null,
    val varianceNote: String? = null
)

// ─── Stock Verification Models ────────────────────────────────────────────────

data class StockVerificationItem(
    val shopProductId: String,
    val productName: String,
    val systemQty: Int,
    val countedQty: Int? = null,
    val variance: Int = 0
)

data class StockVerificationSession(
    val id: String,
    val shopId: String,
    val status: String,
    val createdAt: String,
    val confirmedAt: String? = null,
    val items: List<StockVerificationItem>? = null
)

data class StartStockVerificationDto(val shopId: String)
data class UpdateStockCountDto(val shopProductId: String, val countedQty: Int)
data class ConfirmStockVerificationDto(val sessionId: String)

// ─── Monthly Report Models ────────────────────────────────────────────────────

data class MonthlyProfit(
    val month: String,
    val revenue: Double,
    val expenses: Double,
    val profit: Double
)

data class MonthlyReport(
    val month: String,
    val shopId: String,
    val totalRevenue: Double,
    val totalExpenses: Double,
    val netProfit: Double,
    val salesCount: Int,
    val repairCount: Int
)

// ─── Shrinkage Models ─────────────────────────────────────────────────────────

data class ShrinkageByCategory(val category: String, val lossQty: Int, val lossValue: Double, val percent: Double)
data class ShrinkageByReason(val reason: String, val count: Int, val lossQty: Int, val lossValue: Double)
data class ShrinkageTopProduct(val productId: String, val productName: String, val lossQty: Int, val lossValue: Double)
data class ShrinkageMonthlyTrend(val month: String, val lossQty: Int, val lossValue: Double)

data class ShrinkageIntelligence(
    val totalLossValue: Double = 0.0,
    val totalLossQty: Int = 0,
    val topReason: String? = null,
    val byCategory: List<ShrinkageByCategory> = emptyList(),
    val byReason: List<ShrinkageByReason> = emptyList(),
    val topProducts: List<ShrinkageTopProduct> = emptyList(),
    val monthlyTrend: List<ShrinkageMonthlyTrend> = emptyList()
)

// ─── Expense Intelligence Models ──────────────────────────────────────────────

data class ExpenseIntelligenceCategory(val name: String, val total: Double, val count: Int, val percent: Double)
data class ExpenseIntelligenceTrend(val month: String, val total: Double)

data class ExpenseIntelligence(
    val totalExpenses: Double = 0.0,
    val avgMonthly: Double = 0.0,
    val topCategory: String? = null,
    val byCategory: List<ExpenseIntelligenceCategory> = emptyList(),
    val trend: List<ExpenseIntelligenceTrend> = emptyList()
)

// ─── API ─────────────────────────────────────────────────────────────────────

interface OperationsApi {

    // Expenses
    @POST("api/operations/expenses")
    suspend fun createExpense(@Body dto: CreateExpenseDto): Expense

    @GET("api/operations/expenses")
    suspend fun listExpenses(
        @Query("shopId") shopId: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null,
        @Query("categoryId") categoryId: String? = null
    ): ExpenseListResponse

    @GET("api/operations/expenses/categories/list")
    suspend fun listExpenseCategories(@Query("shopId") shopId: String): List<ExpenseCategory>

    @GET("api/operations/expenses/categories")
    suspend fun getExpenseCategoryBreakdown(
        @Query("shopId") shopId: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): CategoryBreakdownResponse

    // Daily Closing
    @GET("api/cash/daily-history")
    suspend fun getDailyHistory(@Query("shopId") shopId: String): List<DailyClosing>

    @POST("api/cash/daily-close")
    suspend fun submitDailyClosing(@Body dto: SubmitDailyClosingDto): DailyClosing

    @GET("api/mobileshop/reports/daily-summary")
    suspend fun getDailySummary(@Query("shopId") shopId: String, @Query("date") date: String): DailySummary

    // Stock Verification
    @POST("api/operations/stock-verification")
    suspend fun startStockVerification(@Body dto: StartStockVerificationDto): StockVerificationSession

    @GET("api/operations/stock-verification")
    suspend fun listStockVerifications(@Query("shopId") shopId: String): List<StockVerificationSession>

    @PATCH("api/operations/stock-verification/{id}/items")
    suspend fun updateStockCount(
        @Path("id") sessionId: String,
        @Body dto: UpdateStockCountDto
    ): StockVerificationItem

    @POST("api/operations/stock-verification/{id}/confirm")
    suspend fun confirmStockVerification(@Path("id") sessionId: String): StockVerificationSession

    // Monthly Report
    @GET("api/operations/monthly-report")
    suspend fun getMonthlyReport(
        @Query("shopId") shopId: String,
        @Query("month") month: String? = null,
        @Query("year") year: Int? = null
    ): MonthlyReport

    @GET("api/operations/monthly-report/trend")
    suspend fun getMonthlyTrend(
        @Query("shopId") shopId: String,
        @Query("months") months: Int = 6
    ): List<MonthlyProfit>

    // Shrinkage Intelligence
    @GET("api/operations/shrinkage/intelligence")
    suspend fun getShrinkageIntelligence(
        @Query("shopId") shopId: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): ShrinkageIntelligence

    @GET("api/operations/shrinkage/top-loss-products")
    suspend fun getShrinkageTopProducts(
        @Query("shopId") shopId: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): List<ShrinkageTopProduct>

    @GET("api/operations/shrinkage/monthly-trend")
    suspend fun getShrinkageMonthlyTrend(
        @Query("shopId") shopId: String
    ): List<ShrinkageMonthlyTrend>

    // Expense Intelligence
    @GET("api/reports/expense-intelligence")
    suspend fun getExpenseIntelligence(
        @Query("shopId") shopId: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): ExpenseIntelligence
}
