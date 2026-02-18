package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.BillingApi
import com.aiyal.mobibix.data.network.BillingInvoice
import com.aiyal.mobibix.data.network.ResponseStatus
import com.aiyal.mobibix.data.network.SubscriptionPlan
import com.aiyal.mobibix.data.network.UpgradePlanRequest
import javax.inject.Inject
import javax.inject.Singleton

interface BillingRepository {
    suspend fun getSubscriptionPlans(): List<SubscriptionPlan>
    suspend fun getCurrentPlan(shopId: String): SubscriptionPlan
    suspend fun getInvoices(shopId: String): List<BillingInvoice>
    suspend fun upgradePlan(request: UpgradePlanRequest): ResponseStatus
}

@Singleton
class BillingRepositoryImpl @Inject constructor(
    private val api: BillingApi
) : BillingRepository {
    override suspend fun getSubscriptionPlans(): List<SubscriptionPlan> =
        api.getSubscriptionPlans()

    override suspend fun getCurrentPlan(shopId: String): SubscriptionPlan =
        api.getCurrentPlan(shopId)

    override suspend fun getInvoices(shopId: String): List<BillingInvoice> =
        api.getInvoices(shopId)

    override suspend fun upgradePlan(request: UpgradePlanRequest): ResponseStatus =
        api.upgradePlan(request)
}
