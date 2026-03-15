package com.aiyal.mobibix.data.network

import retrofit2.http.*

// ─── Stock Ledger Models ──────────────────────────────────────────────────────

data class StockLedgerEntry(
    val id: String,
    val productId: String,
    val productName: String,
    val txnType: String, // SALE, PURCHASE_GRN, ADJUSTMENT, etc.
    val txnDate: String,
    val quantityIn: Int = 0,
    val quantityOut: Int = 0,
    val balanceQty: Int = 0,
    val costPrice: Double? = null,
    val referenceNo: String? = null,
    val notes: String? = null
)

data class StockLedgerResponse(
    val entries: List<StockLedgerEntry> = emptyList(),
    val openingBalance: Int = 0,
    val closingBalance: Int = 0,
    val totalIn: Int = 0,
    val totalOut: Int = 0
)

// ─── GSTR-1 Models ────────────────────────────────────────────────────────────

data class Gstr1B2bInvoice(
    val invoiceNo: String,
    val date: String,
    val buyerGstin: String,
    val buyerName: String? = null,
    val buyerState: String? = null,
    val invoiceValue: Double,
    val taxableValue: Double,
    val cgst: Double = 0.0,
    val sgst: Double = 0.0,
    val igst: Double = 0.0,
    val totalTax: Double,
    val placeOfSupply: String? = null
)

data class Gstr1B2cInvoice(
    val invoiceNo: String,
    val date: String,
    val invoiceValue: Double,
    val taxableValue: Double,
    val cgst: Double = 0.0,
    val sgst: Double = 0.0,
    val igst: Double = 0.0,
    val totalTax: Double
)

data class Gstr1Summary(
    val totalB2b: Int = 0,
    val totalB2c: Int = 0,
    val totalTaxableValue: Double = 0.0,
    val totalTax: Double = 0.0,
    val totalInvoiceValue: Double = 0.0
)

data class Gstr1Response(
    val b2b: List<Gstr1B2bInvoice> = emptyList(),
    val b2c: List<Gstr1B2cInvoice> = emptyList(),
    val summary: Gstr1Summary = Gstr1Summary()
)

// ─── Purchase Report Models ───────────────────────────────────────────────────

data class PurchaseReportItem(
    val id: String,
    val invoiceNumber: String,
    val supplierName: String,
    val date: String,
    val totalAmount: Double,
    val taxAmount: Double = 0.0,
    val status: String,
    val paymentStatus: String? = null
)

data class PurchaseReportResponse(
    val data: List<PurchaseReportItem> = emptyList(),
    val totalAmount: Double = 0.0,
    val totalTax: Double = 0.0
)

// ─── API ─────────────────────────────────────────────────────────────────────

interface StockLedgerApi {

    @GET("api/mobileshop/stock/ledger")
    suspend fun getStockLedger(
        @Query("shopId") shopId: String,
        @Query("shopProductId") shopProductId: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): StockLedgerResponse

    // GSTR-1 B2B
    @GET("api/mobileshop/reports/gstr-1/b2b")
    suspend fun getGstr1B2b(
        @Query("shopId") shopId: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): List<Gstr1B2bInvoice>

    // GSTR-1 B2C (summary by state)
    @GET("api/mobileshop/reports/gstr-1/b2c")
    suspend fun getGstr1B2c(
        @Query("shopId") shopId: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): List<Gstr1B2cInvoice>

    // Purchase Report
    @GET("api/mobileshop/reports/purchases")
    suspend fun getPurchaseReport(
        @Query("shopId") shopId: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): PurchaseReportResponse
}
