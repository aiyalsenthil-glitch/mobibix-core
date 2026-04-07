package com.aiyal.mobibix.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Query

// Enriched Models matching Web
data class SubscriptionDetails(
    val plan: String = "",
    val planCode: String = "",
    val level: Int = 0,
    val memberLimit: Int? = null,
    val maxStaff: Int? = null,
    val maxShops: Int? = null,
    val whatsappAllowed: Boolean = false,
    val daysLeft: Int = 0, // -1 = lifetime plan (no expiry)
    val isLifetime: Boolean = false,
    val isTrial: Boolean = false,
    val subscriptionStatus: String = "ACTIVE", // ACTIVE, TRIAL, PAST_DUE, EXPIRED
    val autoRenew: Boolean = false,
    val subscriptionId: String = "",
    val price: Double? = null
)

data class BillingCycle(
    val cycle: String, // MONTHLY, QUARTERLY, YEARLY
    val price: Double
)

data class Plan(
    val id: String,
    val code: String? = null,
    val name: String,
    val displayName: String,
    val tagline: String? = null,
    val description: String? = null,
    val level: Int = 0,
    val billingCycles: List<BillingCycle> = emptyList(),
    val features: List<String> = emptyList(),
    val isCurrent: Boolean = false,
    val canUpgrade: Boolean = false,
    val canDowngrade: Boolean = false
)

data class BillingInvoice(
    val id: String,
    val invoiceDate: String? = null,
    val date: String? = null,
    val amount: Double = 0.0,
    val status: String = "PENDING",
    val pdfUrl: String? = null,
    val invoiceNumber: String? = null
)

data class PaginatedBillingInvoicesResponse(
    val items: List<BillingInvoice> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val totalPages: Int = 0
)

data class CreateOrderResponse(
    val orderId: String,
    val amount: Int,
    val currency: String,
    val key: String,
    val REMOVED_PAYMENT_INFRASubscriptionId: String? = null,
    val paymentLink: String? = null
)

data class VerifyPaymentRequest(
    val orderId: String,
    val paymentId: String,
    val signature: String,
    val planId: String,
    val billingCycle: String
)

data class VerifyPaymentResponse(
    val success: Boolean,
    val subscriptionCreated: Boolean,
    val message: String?
)

data class DowngradeCheckResponse(
    val isEligible: Boolean,
    val blockers: List<String>
)

data class UpgradeSubscriptionRequest(
    val newPlanId: String,
    val newBillingCycle: String?,
    val billingType: String? // MANUAL, AUTOPAY
)

interface BillingApi {
    @GET("api/billing/subscription/current")
    suspend fun getSubscription(): Map<String, SubscriptionDetails>

    @GET("api/plans/available")
    suspend fun getAvailablePlans(@Query("module") module: String? = null): List<Plan>

    @GET("api/billing/invoices")
    suspend fun getInvoices(@Query("shopId") shopId: String? = null): PaginatedBillingInvoicesResponse

    @PATCH("api/billing/subscription/auto-renew")
    suspend fun toggleAutoRenew(@Body body: Map<String, Boolean>): Map<String, Any>

    @PATCH("api/billing/subscription/upgrade")
    suspend fun upgradeSubscription(@Body request: UpgradeSubscriptionRequest): CreateOrderResponse

    @PATCH("api/billing/subscription/downgrade")
    suspend fun downgradeSubscription(@Body body: Map<String, String>): ResponseStatus

    @GET("api/billing/subscription/downgrade-check")
    suspend fun checkDowngradeEligibility(@Query("targetPlan") targetPlanId: String): DowngradeCheckResponse

    @POST("api/payments/create-order")
    suspend fun createPaymentOrder(@Body body: Map<String, String>): CreateOrderResponse

    @POST("api/payments/verify")
    suspend fun verifyPayment(@Body request: VerifyPaymentRequest): VerifyPaymentResponse
}

