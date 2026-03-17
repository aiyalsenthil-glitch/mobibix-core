package com.aiyal.mobibix.data.network

import retrofit2.http.*

enum class ReceiptType {
    CUSTOMER, GENERAL, ADJUSTMENT, PAYMENT
}

enum class ReceiptStatus {
    ACTIVE, CANCELLED
}

data class Receipt(
    val id: String,
    val tenantId: String,
    val shopId: String,
    val receiptId: String,
    val printNumber: String,
    val receiptType: ReceiptType,
    val amount: Double,
    val paymentMethod: String,
    val transactionRef: String?,
    val customerId: String?,
    val customerName: String,
    val customerPhone: String?,
    val linkedInvoiceId: String?,
    val linkedJobId: String?,
    val narration: String?,
    val status: ReceiptStatus,
    val createdAt: String
)

data class CreateReceiptRequest(
    val paymentMethod: String,
    val amount: Int, // integer Rupees — backend converts to Paisa
    val receiptType: ReceiptType,
    val customerName: String,
    val shopId: String? = null,
    val customerId: String? = null,
    val customerPhone: String? = null,
    val linkedInvoiceId: String? = null,
    val linkedJobId: String? = null,
    val narration: String? = null,
    val transactionRef: String? = null
)

data class ReceiptsListResponse(
    val data: List<Receipt>,
    val total: Int
)

interface ReceiptApi {
    @GET("api/receipts")
    suspend fun getReceipts(
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null,
        @Query("paymentMethod") paymentMethod: String? = null,
        @Query("status") status: ReceiptStatus? = null,
        @Query("skip") skip: Int? = null,
        @Query("take") take: Int? = null
    ): ReceiptsListResponse

    @POST("api/receipts")
    suspend fun createReceipt(@Body request: CreateReceiptRequest): Receipt

    @POST("api/receipts/{id}/cancel")
    suspend fun cancelReceipt(@Path("id") id: String, @Body body: Map<String, String>): Receipt
}
