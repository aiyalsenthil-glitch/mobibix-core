package com.aiyal.mobibix.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Query

// Enriched Models matching Web
data class SubscriptionDetails(
    val plan: String,
    val planCode: String,
    val level: Int,
    val memberLimit: Int?,
    val maxStaff: Int?,
    val maxShops: Int?,
    val whatsappAllowed: Boolean,
    val daysLeft: Int,
    val isTrial: Boolean,
    val subscriptionStatus: String, // ACTIVE, TRIAL, PAST_DUE, EXPIRED
    val autoRenew: Boolean,
    val subscriptionId: String,
    val price: Double?
)

data class BillingCycle(
    val cycle: String, // MONTHLY, QUARTERLY, YEARLY
    val price: Double
)

data class Plan(
    val id: String,
    val code: String,
    val name: String,
    val displayName: String,
    val tagline: String?,
    val description: String?,
    val level: Int,
    val billingCycles: List<BillingCycle>,
    val features: List<String>,
    val isCurrent: Boolean,
    val canUpgrade: Boolean,
    val canDowngrade: Boolean
)

data class BillingInvoice(
    val id: String,
    val date: String,
    val amount: Double,
    val status: String, // PAID, PENDING, FAILED
    val pdfUrl: String?
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
    suspend fun getInvoices(@Query("shopId") shopId: String): List<BillingInvoice>

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

