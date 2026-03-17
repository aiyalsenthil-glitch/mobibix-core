package com.aiyal.mobibix.data.network

import retrofit2.http.*

enum class PurchaseStatus {
    DRAFT, SUBMITTED, PARTIALLY_PAID, PAID, CANCELLED
}

enum class PurchaseOrderStatus {
    DRAFT, ORDERED, DISPATCHED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
}

enum class GRNStatus {
    DRAFT, CONFIRMED, CANCELLED
}

data class PurchaseOrderItem(
    val id: String,
    val shopProductId: String,
    val description: String,
    val quantity: Int,
    val receivedQuantity: Int,
    val price: Double,
    val uom: String?
)

data class PurchaseOrder(
    val id: String,
    val tenantId: String,
    val shopId: String,
    val globalSupplierId: String,
    val supplierName: String,
    val poNumber: String,
    val orderDate: String,
    val expectedDeliveryDate: String?,
    val status: PurchaseOrderStatus,
    val currency: String,
    val exchangeRate: Double,
    val paymentDueDays: Int,
    val items: List<PurchaseOrderItem>,
    val createdAt: String
)

data class CreatePurchaseOrderItemDto(
    val shopProductId: String,
    val description: String,
    val quantity: Int,
    val price: Double,
    val uom: String?
)

data class CreatePurchaseOrderDto(
    val shopId: String,
    val globalSupplierId: String,
    val poNumber: String,
    val orderDate: String?,
    val expectedDeliveryDate: String?,
    val currency: String?,
    val exchangeRate: Double?,
    val paymentDueDays: Int?,
    val items: List<CreatePurchaseOrderItemDto>
)

data class GRNItem(
    val id: String,
    val poItemId: String,
    val shopProductId: String,
    val receivedQuantity: Int,
    val confirmedPrice: Double?,
    val uom: String?
)

data class GRN(
    val id: String,
    val tenantId: String,
    val shopId: String,
    val poId: String,
    val grnNumber: String,
    val receivedDate: String,
    val status: GRNStatus,
    val isVarianceOverridden: Boolean,
    val overrideNote: String?,
    val overriddenBy: String?,
    val items: List<GRNItem>,
    val createdAt: String
)

data class CreateGRNItemDto(
    val poItemId: String,
    val shopProductId: String,
    val receivedQuantity: Int,
    val confirmedPrice: Double?,
    val uom: String?
)

data class CreateGRNDto(
    val shopId: String,
    val poId: String,
    val grnNumber: String,
    val receivedDate: String?,
    val isVarianceOverridden: Boolean?,
    val overrideNote: String?,
    val items: List<CreateGRNItemDto>
)

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
    val currency: String,
    val exchangeRate: Double,
    val poId: String?,
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
    val items: List<PurchaseItemDto>,
    val currency: String?,
    val exchangeRate: Double?,
    val poId: String?,
    val grnId: String?
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

data class PurchaseOrderListResponse(
    val data: List<PurchaseOrder> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val limit: Int = 50
)

data class GrnListResponse(
    val data: List<GRN> = emptyList(),
    val total: Int = 0
)

interface PurchaseApi {
    // Purchase Invoices
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

    // Purchase Orders
    @GET("api/purchase-orders")
    suspend fun listPurchaseOrders(
        @Query("shopId") shopId: String?,
        @Query("status") status: PurchaseOrderStatus? = null
    ): PurchaseOrderListResponse

    @GET("api/purchase-orders/{id}")
    suspend fun getPurchaseOrder(@Path("id") id: String): PurchaseOrder

    @POST("api/purchase-orders")
    suspend fun createPurchaseOrder(@Body data: CreatePurchaseOrderDto): PurchaseOrder

    @POST("api/purchase-orders/{id}/status")
    suspend fun transitionPOStatus(@Path("id") id: String, @Query("status") status: PurchaseOrderStatus): PurchaseOrder

    // GRNs
    @GET("api/grns")
    suspend fun listGrns(@Query("shopId") shopId: String?): List<GRN>

    @GET("api/grns/{id}")
    suspend fun getGrn(@Path("id") id: String): GRN

    @POST("api/grns")
    suspend fun createGrn(@Body data: CreateGRNDto): GRN

    @POST("api/grns/{id}/confirm")
    suspend fun confirmGrn(@Path("id") id: String): GRN
}
