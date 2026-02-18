package com.aiyal.mobibix.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

// --- Data Models ---

data class CreateInvoiceRequest(
    val shopId: String,
    val customerName: String?,
    val customerPhone: String?,
    val paymentMode: String,
    val items: List<InvoiceItemRequest> // Updated item request
)

// Updated to match final backend DTO for invoice creation
data class InvoiceItemRequest(
    val shopProductId: String,
    val quantity: Int,
    val rate: Int,
    val gstRate: Float,
    val gstAmount: Int,
    val lineTotal: Int
)

data class InvoiceResponse(
    val id: String,
    val invoiceNumber: String
)

data class InvoiceListItem(
    val id: String,
    val invoiceNumber: String,
    val totalAmount: Int,
    val paymentMode: String,
    val status: String,
    val invoiceDate: String
)

// Wrapper to match backend's paginated response: {data: [], pagination: {}}
data class PaginatedInvoiceResponse(
    val data: List<InvoiceListItem> = emptyList()
)

data class InvoiceDetails(
    val id: String,
    val invoiceNumber: String,
    val status: String,
    val invoiceDate: String,
    val customerName: String?,
    val customerPhone: String?,
    val subTotal: Int,
    val gstAmount: Int,
    val totalAmount: Int,
    val paymentMode: String,
    val items: List<InvoiceItemDetail>
)

data class InvoiceItemDetail(
    val shopProductId: String,
    val productName: String,
    val quantity: Int,
    val rate: Int,
    val gstRate: Float,
    val gstAmount: Int,
    val lineTotal: Int
)


// --- API Interface ---

interface SalesApi {

    @POST("api/mobileshop/sales/invoice")
    suspend fun createInvoice(
        @Body request: CreateInvoiceRequest
    ): InvoiceResponse

    @GET("api/mobileshop/sales/invoices")
    suspend fun listInvoices(
        @Query("shopId") shopId: String
    ): PaginatedInvoiceResponse

    @GET("api/mobileshop/sales/invoice/{invoiceId}")
    suspend fun getInvoiceDetails(
        @Path("invoiceId") invoiceId: String
    ): InvoiceDetails

    @POST("api/mobileshop/sales/invoice/{invoiceId}/cancel")
    suspend fun cancelInvoice(
        @Path("invoiceId") invoiceId: String
    )
}
