package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.BillingApi
import com.aiyal.mobibix.data.network.*
import javax.inject.Inject
import javax.inject.Singleton

interface BillingRepository {
    suspend fun getSubscription(): SubscriptionDetails
    suspend fun getAvailablePlans(module: String? = null): List<Plan>
    suspend fun getInvoices(shopId: String): List<BillingInvoice>
    suspend fun toggleAutoRenew(enabled: Boolean): Boolean
    suspend fun upgradeSubscription(planId: String, cycle: String?, billingType: String?): CreateOrderResponse
    suspend fun downgradeSubscription(planId: String, cycle: String?): ResponseStatus
    suspend fun checkDowngradeEligibility(targetPlanId: String): DowngradeCheckResponse
    suspend fun createPaymentOrder(planId: String, billingCycle: String): CreateOrderResponse
    suspend fun verifyPayment(request: VerifyPaymentRequest): VerifyPaymentResponse
}

@Singleton
class BillingRepositoryImpl @Inject constructor(
    private val api: BillingApi
) : BillingRepository {
    override suspend fun getSubscription(): SubscriptionDetails =
        api.getSubscription()["current"]!!

    override suspend fun getAvailablePlans(module: String?): List<Plan> =
        api.getAvailablePlans(module)

    override suspend fun getInvoices(shopId: String): List<BillingInvoice> =
        api.getInvoices(shopId)

    override suspend fun toggleAutoRenew(enabled: Boolean): Boolean {
        val response = api.toggleAutoRenew(mapOf("enabled" to enabled))
        return response["autoRenew"] as? Boolean ?: enabled
    }

    override suspend fun upgradeSubscription(planId: String, cycle: String?, billingType: String?): CreateOrderResponse =
        api.upgradeSubscription(UpgradeSubscriptionRequest(planId, cycle, billingType))

    override suspend fun downgradeSubscription(planId: String, cycle: String?): ResponseStatus =
        api.downgradeSubscription(mutableMapOf("newPlanId" to planId).apply {
            cycle?.let { put("newBillingCycle", it) }
        })

    override suspend fun checkDowngradeEligibility(targetPlanId: String): DowngradeCheckResponse =
        api.checkDowngradeEligibility(targetPlanId)

    override suspend fun createPaymentOrder(planId: String, billingCycle: String): CreateOrderResponse =
        api.createPaymentOrder(mapOf("planId" to planId, "billingCycle" to billingCycle))

    override suspend fun verifyPayment(request: VerifyPaymentRequest): VerifyPaymentResponse =
        api.verifyPayment(request)
}
