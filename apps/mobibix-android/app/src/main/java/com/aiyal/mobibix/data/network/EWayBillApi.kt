package com.aiyal.mobibix.data.network

import retrofit2.http.*

enum class EWayBillStatus { ACTIVE, CANCELLED, EXPIRED }

data class EWayBill(
    val id: String,
    val shopId: String,
    val invoiceId: String?,
    val ewbNumber: String,
    val status: EWayBillStatus,
    val validFrom: String,
    val validUntil: String,
    val supplierGstin: String?,
    val recipientGstin: String?,
    val totalValue: Double,
    val vehicleNumber: String?,
    val distance: Int?,
    val createdAt: String
)

data class GenerateEWayBillDto(
    val shopId: String,
    val invoiceId: String?,
    val supplierGstin: String?,
    val recipientGstin: String,
    val totalValue: Double,
    val vehicleNumber: String?,
    val distance: Int?,
    val transactionType: String?,
    val subType: String?
)

data class EWayBillListResponse(
    val data: List<EWayBill> = emptyList(),
    val total: Int = 0
)

interface EWayBillApi {
    @GET("api/mobileshop/shops/{shopId}/eway-bills")
    suspend fun listEWayBills(
        @Path("shopId") shopId: String,
        @Query("status") status: EWayBillStatus? = null,
        @Query("skip") skip: Int? = null,
        @Query("take") take: Int? = null
    ): EWayBillListResponse

    @GET("api/mobileshop/shops/{shopId}/eway-bills/{id}")
    suspend fun getEWayBill(
        @Path("shopId") shopId: String,
        @Path("id") id: String
    ): EWayBill

    @POST("api/mobileshop/shops/{shopId}/eway-bills/generate")
    suspend fun generateEWayBill(
        @Path("shopId") shopId: String,
        @Body data: GenerateEWayBillDto
    ): EWayBill

    @DELETE("api/mobileshop/shops/{shopId}/eway-bills/{id}/cancel")
    suspend fun cancelEWayBill(
        @Path("shopId") shopId: String,
        @Path("id") id: String
    ): EWayBill
}
