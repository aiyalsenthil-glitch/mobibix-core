package com.aiyal.mobibix.data.network

import retrofit2.http.*

enum class PurchaseStatus {
    DRAFT, SUBMITTED, PARTIALLY_PAID, PAID, CANCELLED
}

data class PurchaseItem(
    val id: String,
    val shopProductId: String?,
    val description: String,
    val hsnSac: String?,
    val quantity: Int,
    val purchasePrice: Double,
    val gstRate: Double?,
    val subTotal: Double,
    val gstAmount: Double,
    val total: Double
)

data class SupplierPayment(
    val id: String,
    val amount: Double,
    val paymentMethod: String,
    val paymentReference: String?,
    val notes: String?,
    val createdAt: String
)

data class Purchase(
    val id: String,
    val shopId: String,
    val globalSupplierId: String?,
    val supplierName: String,
    val supplierGstin: String?,
    val invoiceNumber: String,
    val invoiceDate: String,
    val dueDate: String?,
    val status: PurchaseStatus,
    val paymentMethod: String,
    val subTotal: Double,
    val totalGst: Double,
    val grandTotal: Double,
    val paidAmount: Double,
    val outstandingAmount: Double,
    val items: List<PurchaseItem>,
    val payments: List<SupplierPayment>?,
    val createdAt: String
)

data class PurchaseItemDto(
    val shopProductId: String?,
    val description: String,
    val hsnSac: String?,
    val quantity: Int,
    val purchasePrice: Double,
    val gstRate: Double?
)

data class CreatePurchaseDto(
    val shopId: String,
    val globalSupplierId: String?,
    val supplierName: String,
    val supplierGstin: String?,
    val invoiceNumber: String,
    val invoiceDate: String?,
    val dueDate: String?,
    val paymentMethod: String,
    val status: PurchaseStatus?,
    val items: List<PurchaseItemDto>
)

data class RecordPaymentDto(
    val amount: Double,
    val paymentMethod: String,
    val paymentReference: String?,
    val notes: String?
)

data class PurchaseListResponse(
    val data: List<Purchase>,
    val total: Int
)

interface PurchaseApi {
    @GET("api/purchases")
    suspend fun listPurchases(
        @Query("shopId") shopId: String,
        @Query("status") status: PurchaseStatus? = null,
        @Query("supplierId") supplierId: String? = null,
        @Query("skip") skip: Int? = null,
        @Query("take") take: Int? = null
    ): PurchaseListResponse

    @GET("api/purchases/{id}")
    suspend fun getPurchase(@Path("id") id: String): Purchase

    @POST("api/purchases")
    suspend fun createPurchase(@Body data: CreatePurchaseDto): Purchase

    @POST("api/purchases/{id}/submit")
    suspend fun submitPurchase(@Path("id") id: String): Any

    @POST("api/purchases/{id}/pay")
    suspend fun recordPayment(@Path("id") id: String, @Body data: RecordPaymentDto): Purchase
}
