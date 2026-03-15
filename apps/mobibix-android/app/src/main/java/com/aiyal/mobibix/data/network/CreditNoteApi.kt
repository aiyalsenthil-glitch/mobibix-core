package com.aiyal.mobibix.data.network

import retrofit2.http.*

// ─── Enums ───────────────────────────────────────────────────────────────────

enum class CreditNoteType { CUSTOMER, SUPPLIER }
enum class CreditNoteReason { SALES_RETURN, PURCHASE_RETURN, PRICE_ADJUSTMENT, DISCOUNT_POST_SALE, OVERBILLING, WARRANTY_CLAIM }
enum class CreditNoteStatus { DRAFT, ISSUED, PARTIALLY_APPLIED, FULLY_APPLIED, REFUNDED, VOIDED }

// ─── Models ──────────────────────────────────────────────────────────────────

data class CreditNoteItem(
    val id: String? = null,
    val shopProductId: String? = null,
    val description: String,
    val quantity: Int,
    val rate: Double,
    val hsnCode: String? = null,
    val gstRate: Double,
    val gstAmount: Double,
    val lineTotal: Double,
    val restockItem: Boolean = false
)

data class CreditNote(
    val id: String,
    val creditNoteNo: String,
    val date: String,
    val type: String,
    val reason: String,
    val status: String,
    val subTotal: Double,
    val gstAmount: Double,
    val totalAmount: Double,
    val appliedAmount: Double,
    val refundedAmount: Double,
    val notes: String? = null,
    val customerName: String? = null,
    val supplierName: String? = null,
    val invoiceNumber: String? = null,
    val items: List<CreditNoteItem>? = null,
    val createdAt: String? = null
)

data class CreateCreditNoteItemDto(
    val shopProductId: String? = null,
    val description: String,
    val quantity: Int,
    val rate: Double,
    val hsnCode: String? = null,
    val gstRate: Double = 0.0,
    val gstAmount: Double = 0.0,
    val lineTotal: Double,
    val restockItem: Boolean = false
)

data class CreateCreditNoteDto(
    val type: String,
    val reason: String,
    val customerId: String? = null,
    val supplierId: String? = null,
    val linkedInvoiceId: String? = null,
    val date: String? = null,
    val notes: String? = null,
    val items: List<CreateCreditNoteItemDto>
)

data class ApplyCreditNoteDto(
    val invoiceId: String? = null,
    val amount: Double
)

data class VoidCreditNoteDto(val reason: String)

data class CreditNoteListResponse(val data: List<CreditNote> = emptyList())

// ─── API ─────────────────────────────────────────────────────────────────────

interface CreditNoteApi {

    @GET("api/mobileshop/shops/{shopId}/credit-notes")
    suspend fun listCreditNotes(
        @Path("shopId") shopId: String,
        @Query("type") type: String? = null,
        @Query("status") status: String? = null,
        @Query("search") search: String? = null,
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null
    ): List<CreditNote>

    @GET("api/mobileshop/shops/{shopId}/credit-notes/{id}")
    suspend fun getCreditNote(
        @Path("shopId") shopId: String,
        @Path("id") id: String
    ): CreditNote

    @POST("api/mobileshop/shops/{shopId}/credit-notes")
    suspend fun createCreditNote(
        @Path("shopId") shopId: String,
        @Body dto: CreateCreditNoteDto
    ): CreditNote

    @POST("api/mobileshop/shops/{shopId}/credit-notes/{id}/issue")
    suspend fun issueCreditNote(
        @Path("shopId") shopId: String,
        @Path("id") id: String
    ): CreditNote

    @POST("api/mobileshop/shops/{shopId}/credit-notes/{id}/apply")
    suspend fun applyCreditNote(
        @Path("shopId") shopId: String,
        @Path("id") id: String,
        @Body dto: ApplyCreditNoteDto
    ): CreditNote

    @POST("api/mobileshop/shops/{shopId}/credit-notes/{id}/refund")
    suspend fun refundCreditNote(
        @Path("shopId") shopId: String,
        @Path("id") id: String
    ): CreditNote

    @POST("api/mobileshop/shops/{shopId}/credit-notes/{id}/void")
    suspend fun voidCreditNote(
        @Path("shopId") shopId: String,
        @Path("id") id: String,
        @Body dto: VoidCreditNoteDto
    ): CreditNote
}
