package com.aiyal.mobibix.data.network

import retrofit2.http.*

// ─── Models ──────────────────────────────────────────────────────────────────

data class QuotationItem(
    val id: String? = null,
    val shopProductId: String? = null,
    val description: String,
    val quantity: Int,
    val price: Double,
    val gstRate: Double = 0.0,
    val gstAmount: Double = 0.0,
    val lineTotal: Double,
    val totalAmount: Double,
    val productName: String? = null
)

data class Quotation(
    val id: String,
    val quotationNumber: String,
    val customerName: String,
    val customerPhone: String? = null,
    val quotationDate: String,
    val subTotal: Double,
    val gstAmount: Double,
    val totalAmount: Double,
    val notes: String? = null,
    val status: String,
    val validityDays: Int = 7,
    val expiryDate: String? = null,
    val linkedInvoiceId: String? = null,
    val linkedJobCardId: String? = null,
    val conversionType: String? = null,
    val items: List<QuotationItem>? = null,
    val createdAt: String? = null
)

data class CreateQuotationItemDto(
    val shopProductId: String? = null,
    val description: String,
    val quantity: Int,
    val price: Double,
    val gstRate: Double = 0.0,
    val gstAmount: Double = 0.0,
    val lineTotal: Double = 0.0,
    val totalAmount: Double
)

data class CreateQuotationDto(
    val customerName: String,
    val customerPhone: String? = null,
    val customerId: String? = null,
    val quotationDate: String? = null,
    val validityDays: Int? = null,
    val notes: String? = null,
    val items: List<CreateQuotationItemDto>
)

data class UpdateQuotationStatusDto(val status: String)

data class ConvertQuotationDto(
    val conversionType: String, // "INVOICE" or "JOB_CARD"
    val deviceType: String? = null,
    val deviceBrand: String? = null,
    val deviceModel: String? = null,
    val customerComplaint: String? = null
)

data class ConvertQuotationResponse(
    val invoiceId: String? = null,
    val jobCardId: String? = null
)

// ─── API ─────────────────────────────────────────────────────────────────────

interface QuotationApi {

    @GET("api/mobileshop/shops/{shopId}/quotations")
    suspend fun listQuotations(
        @Path("shopId") shopId: String,
        @Query("status") status: String? = null,
        @Query("search") search: String? = null,
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null
    ): List<Quotation>

    @GET("api/mobileshop/shops/{shopId}/quotations/{id}")
    suspend fun getQuotation(
        @Path("shopId") shopId: String,
        @Path("id") id: String
    ): Quotation

    @POST("api/mobileshop/shops/{shopId}/quotations")
    suspend fun createQuotation(
        @Path("shopId") shopId: String,
        @Body dto: CreateQuotationDto
    ): Quotation

    @POST("api/mobileshop/shops/{shopId}/quotations/{id}/status")
    suspend fun updateQuotationStatus(
        @Path("shopId") shopId: String,
        @Path("id") id: String,
        @Body dto: UpdateQuotationStatusDto
    ): Quotation

    @POST("api/mobileshop/shops/{shopId}/quotations/{id}/convert")
    suspend fun convertQuotation(
        @Path("shopId") shopId: String,
        @Path("id") id: String,
        @Body dto: ConvertQuotationDto
    ): ConvertQuotationResponse

    @DELETE("api/mobileshop/shops/{shopId}/quotations/{id}")
    suspend fun deleteQuotation(
        @Path("shopId") shopId: String,
        @Path("id") id: String
    )
}
