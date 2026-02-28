package com.aiyal.mobibix.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

// --- Request Models ---

/**
 * Invoice creation request.
 * IMPORTANT: [rate] must be in RUPEES (not Paisa). Backend converts to Paisa via toPaisa().
 */
data class CreateInvoiceRequest(
    val shopId: String,
    val customerId: String? = null,           // Links invoice to Party record for CRM/loyalty
    val customerName: String?,
    val customerPhone: String? = null,
    val customerState: String? = null,        // Used for CGST/SGST vs IGST determination
    val customerGstin: String? = null,        // Buyer GSTIN for B2B ITC eligibility
    val invoiceDate: String? = null,          // ISO date string e.g. "2026-02-28"
    val paymentMode: String = "CASH",
    val pricesIncludeTax: Boolean = false,    // Whether rate already includes GST
    val items: List<InvoiceItemRequest>
)

/**
 * Per-item invoice request.
 * IMPORTANT: [rate] must be in RUPEES (not Paisa). Backend multiplies by 100 internally.
 * [gstAmount] is optional — backend IGNORES this value and recalculates. Omit it.
 */
data class InvoiceItemRequest(
    val shopProductId: String,
    val quantity: Int,
    val rate: Double,        // Unit price in RUPEES (salePrice / 100)
    val gstRate: Double,     // GST rate as percentage: 0.0, 5.0, 12.0, 18.0, 28.0 — use Double to avoid Float precision issues
    val warrantyDays: Int? = null
    // NOTE: lineTotal is NOT part of the backend DTO and must NOT be sent
    // NOTE: gstAmount is intentionally omitted — backend recalculates from rate + gstRate
)

data class InvoiceResponse(
    val id: String,
    val invoiceNumber: String
)

// --- List Response Models ---

data class InvoiceListItem(
    val id: String,
    val invoiceNumber: String,
    val totalAmount: Double,   // Backend returns Rupees (fromPaisa) — use Double, not Int
    val paymentMode: String,
    val status: String,
    val invoiceDate: String,
    val customerName: String? = null
)

// Wrapper to match backend's paginated response: {data: [], pagination: {}}
data class PaginatedInvoiceResponse(
    val data: List<InvoiceListItem> = emptyList()
)

// --- Detail Response Models ---

/**
 * Full invoice details response.
 * All monetary amounts are in RUPEES (backend converts from Paisa via fromPaisa()).
 * Use Double, not Int — amounts like ₹849.32 are valid.
 */
data class InvoiceDetails(
    val id: String,
    val invoiceNumber: String,
    val status: String,
    val invoiceDate: String,
    val customerName: String?,
    val customerPhone: String?,
    val customerGstin: String? = null,       // Buyer GSTIN
    val shopGstin: String? = null,           // Seller GSTIN snapshot (P0 GST compliance)
    val subTotal: Double,                    // Rupees float — do NOT declare as Int
    val gstAmount: Double,                   // Rupees float
    val cgst: Double? = null,
    val sgst: Double? = null,
    val igst: Double? = null,
    val totalAmount: Double,                 // Rupees float
    val paymentMode: String,
    val paymentStatus: String? = null,
    val isGstApplicable: Boolean = false,
    val items: List<InvoiceItemDetail>
)

data class InvoiceItemDetail(
    val shopProductId: String,
    val productName: String,
    val quantity: Int,
    val rate: Double,        // Rupees float — do NOT declare as Int
    val gstRate: Double? = null,
    val gstAmount: Double? = null,   // Rupees float
    val lineTotal: Double,           // Rupees float
    val hsnCode: String? = null,
    val cgstRate: Double? = null,
    val sgstRate: Double? = null,
    val igstRate: Double? = null,
    val cgstAmount: Double? = null,
    val sgstAmount: Double? = null,
    val igstAmount: Double? = null
)

// --- API Interface ---

interface SalesApi {

    @POST("api/mobileshop/sales/invoice")
    suspend fun createInvoice(
        @Body request: CreateInvoiceRequest
    ): InvoiceDetails  // Backend returns full invoice details on creation

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
    ): InvoiceDetails  // Backend returns updated invoice after cancel
}
