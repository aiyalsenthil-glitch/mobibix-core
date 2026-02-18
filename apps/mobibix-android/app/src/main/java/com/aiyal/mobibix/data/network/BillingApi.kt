package com.aiyal.mobibix.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

data class SubscriptionPlan(
    val id: String,
    val name: String,
    val price: Double,
    val features: List<String>,
    val isActive: Boolean
)

data class BillingInvoice(
    val id: String,
    val date: String,
    val amount: Double,
    val status: String, // PAID, PENDING, FAILED
    val pdfUrl: String?
)

data class UpgradePlanRequest(
    val shopId: String,
    val planId: String
)

interface BillingApi {
    @GET("api/billing/plans")
    suspend fun getSubscriptionPlans(): List<SubscriptionPlan>

    @GET("api/billing/current-plan")
    suspend fun getCurrentPlan(@Query("shopId") shopId: String): SubscriptionPlan

    @GET("api/billing/invoices")
    suspend fun getInvoices(@Query("shopId") shopId: String): List<BillingInvoice>

    @POST("api/billing/upgrade")
    suspend fun upgradePlan(@Body request: UpgradePlanRequest): ResponseStatus
}
