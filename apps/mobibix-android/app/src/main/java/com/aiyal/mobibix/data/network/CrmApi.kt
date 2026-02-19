package com.aiyal.mobibix.data.network

import retrofit2.http.*

data class CrmDashboardStats(
    val totalCustomers: Int,
    val newCustomersChange: Int, // e.g. +5
    val activeFollowUps: Int,
    val pendingFollowUps: Int,
    val completedFollowUps: Int
)

data class FollowUp(
    val id: String,
    val customerId: String,
    val customerName: String,
    val type: String, // CALL, WHATSAPP, VISIT
    val status: String, // PENDING, COMPLETED, CANCELLED
    val duelDate: String, // ISO date
    val note: String?,
    val priority: String // HIGH, MEDIUM, LOW
)

data class CreateFollowUpRequest(
    val customerId: String,
    val type: String,
    val dueDate: String,
    val note: String?,
    val priority: String
)

interface CrmApi {
    @GET("api/crm/stats")
    suspend fun getDashboardStats(@Query("shopId") shopId: String): CrmDashboardStats

    @GET("api/crm/follow-ups")
    suspend fun getFollowUps(
        @Query("shopId") shopId: String,
        @Query("status") status: String? = null
    ): List<FollowUp>

    @POST("api/crm/follow-ups")
    suspend fun createFollowUp(@Body request: CreateFollowUpRequest): FollowUp

    @PATCH("api/crm/follow-ups/{id}/complete")
    suspend fun completeFollowUp(@Path("id") id: String)
}
