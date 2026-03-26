package com.aiyal.mobibix.data.network

import retrofit2.http.*

// ─── Models ──────────────────────────────────────────────────────────────────

data class EmiApplication(
    val id: String,
    val emiNumber: String,
    val financeProvider: String,
    val applicationRef: String? = null,
    val loanAmount: Long = 0L,
    val downPayment: Long = 0L,
    val tenureMonths: Int = 0,
    val monthlyEmi: Long = 0L,
    val interestRate: Double? = null,
    val status: String = "APPLIED",
    val notes: String? = null,
    val createdAt: String = ""
)

data class InstallmentPlan(
    val id: String,
    val planNumber: String,
    val customerName: String? = null,
    val totalAmount: Long = 0L,
    val downPayment: Long = 0L,
    val remainingAmount: Long = 0L,
    val tenureMonths: Int = 0,
    val monthlyAmount: Long = 0L,
    val status: String = "ACTIVE",
    val startDate: String = "",
    val createdAt: String = "",
    val slots: List<InstallmentSlot> = emptyList()
)

data class InstallmentSlot(
    val id: String,
    val slotNumber: Int,
    val dueDate: String,
    val amount: Long,
    val paidAmount: Long = 0L,
    val status: String = "PENDING"
)

data class EmiCountAmount(val count: Int = 0, val totalLoanAmount: Long? = null, val totalSettled: Long? = null)
data class EmiRejected(val count: Int = 0)
data class EmiStats(
    val pending: EmiCountAmount = EmiCountAmount(),
    val approved: EmiCountAmount = EmiCountAmount(),
    val settled: EmiCountAmount = EmiCountAmount(),
    val rejected: EmiRejected = EmiRejected()
)
data class ActivePlansStats(val count: Int = 0, val totalRemaining: Long = 0L)
data class MonthDueStats(val count: Int = 0, val amount: Long = 0L)
data class InstallmentStats(
    val activePlans: ActivePlansStats = ActivePlansStats(),
    val overdueSlots: Int = 0,
    val thisMonthDue: MonthDueStats = MonthDueStats()
)
data class FinanceSummary(
    val emi: EmiStats = EmiStats(),
    val installment: InstallmentStats = InstallmentStats()
)

data class CreateEmiRequest(
    val shopId: String,
    val invoiceId: String? = null,
    val financeProvider: String,
    val applicationRef: String? = null,
    val loanAmount: Long,
    val downPayment: Long = 0L,
    val tenureMonths: Int,
    val monthlyEmi: Long,
    val interestRate: Double? = null,
    val notes: String? = null
)

data class CreateInstallmentRequest(
    val shopId: String,
    val invoiceId: String? = null,
    val customerId: String,
    val totalAmount: Long,
    val downPayment: Long = 0L,
    val tenureMonths: Int,
    val notes: String? = null
)

// ─── API ─────────────────────────────────────────────────────────────────────

interface ConsumerFinanceApi {
    @GET("api/finance/summary")
    suspend fun getSummary(@Query("shopId") shopId: String): FinanceSummary

    @GET("api/finance/emi")
    suspend fun getEmiApplications(
        @Query("shopId") shopId: String,
        @Query("status") status: String? = null
    ): List<EmiApplication>

    @POST("api/finance/emi")
    suspend fun createEmi(@Body request: CreateEmiRequest): EmiApplication

    @GET("api/finance/installment")
    suspend fun getInstallmentPlans(
        @Query("shopId") shopId: String,
        @Query("status") status: String? = null
    ): List<InstallmentPlan>

    @POST("api/finance/installment")
    suspend fun createInstallmentPlan(@Body request: CreateInstallmentRequest): InstallmentPlan
}
