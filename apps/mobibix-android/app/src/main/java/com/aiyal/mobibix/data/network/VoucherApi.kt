package com.aiyal.mobibix.data.network

import retrofit2.http.*

enum class VoucherType {
    SUPPLIER, EXPENSE, SALARY, ADJUSTMENT
}

enum class VoucherStatus {
    ACTIVE, CANCELLED
}

data class PaymentVoucher(
    val id: String,
    val tenantId: String,
    val shopId: String,
    val voucherId: String,
    val voucherType: VoucherType,
    val date: String,
    val amount: Double,
    val paymentMethod: String,
    val transactionRef: String?,
    val narration: String?,
    val globalSupplierId: String?,
    val expenseCategory: String?,
    val linkedPurchaseId: String?,
    val status: VoucherStatus,
    val createdAt: String
)

data class CreateVoucherRequest(
    val paymentMethod: String,
    val amount: Int, // integer Rupees — backend converts to Paisa
    val voucherType: VoucherType,
    val shopId: String? = null,
    val globalSupplierId: String? = null,
    val expenseCategory: String? = null,
    val linkedPurchaseId: String? = null,
    val narration: String? = null,
    val transactionRef: String? = null
)

data class VouchersListResponse(
    val data: List<PaymentVoucher>,
    val total: Int
)

interface VoucherApi {
    @GET("api/vouchers")
    suspend fun getVouchers(
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null,
        @Query("paymentMethod") paymentMethod: String? = null,
        @Query("status") status: VoucherStatus? = null,
        @Query("voucherType") voucherType: VoucherType? = null,
        @Query("skip") skip: Int? = null,
        @Query("take") take: Int? = null
    ): VouchersListResponse

    @POST("api/vouchers")
    suspend fun createVoucher(@Body request: CreateVoucherRequest): PaymentVoucher

    @POST("api/vouchers/{id}/cancel")
    suspend fun cancelVoucher(@Path("id") id: String, @Body body: Map<String, String>): PaymentVoucher
}
