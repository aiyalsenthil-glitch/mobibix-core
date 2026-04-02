package com.aiyal.mobibix.data.network

import retrofit2.http.*

enum class CommissionType { PERCENTAGE, FIXED }
enum class CommissionStatus { PENDING, APPROVED, PAID, CANCELLED }

data class StaffCommission(
    val id: String,
    val shopId: String,
    val staffId: String,
    val staffName: String,
    val invoiceId: String?,
    val invoiceNumber: String?,
    val commissionType: CommissionType,
    val rate: Double,
    val saleAmount: Double,
    val commissionAmount: Double,
    val status: CommissionStatus,
    val paidAt: String?,
    val createdAt: String
)

data class CommissionSummary(
    val totalPending: Double,
    val totalApproved: Double,
    val totalPaid: Double,
    val commissions: List<StaffCommission>
)

data class ApproveCommissionDto(val ids: List<String>)
data class PayCommissionDto(val ids: List<String>, val paymentMethod: String, val paymentReference: String?)

interface CommissionApi {
    @GET("api/mobileshop/shops/{shopId}/commissions")
    suspend fun listCommissions(
        @Path("shopId") shopId: String,
        @Query("staffId") staffId: String? = null,
        @Query("status") status: CommissionStatus? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): CommissionSummary

    @POST("api/mobileshop/shops/{shopId}/commissions/approve")
    suspend fun approveCommissions(
        @Path("shopId") shopId: String,
        @Body data: ApproveCommissionDto
    ): Any

    @POST("api/mobileshop/shops/{shopId}/commissions/pay")
    suspend fun payCommissions(
        @Path("shopId") shopId: String,
        @Body data: PayCommissionDto
    ): Any
}
