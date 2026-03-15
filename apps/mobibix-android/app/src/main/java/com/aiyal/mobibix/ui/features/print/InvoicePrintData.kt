package com.aiyal.mobibix.ui.features.print

data class InvoicePrintData(
    val invoiceNumber: String,
    val date: String,
    val shopName: String,
    val shopAddress: String,
    val shopPhone: String,
    val shopGstin: String?,
    val customerName: String?,
    val customerPhone: String?,
    val items: List<InvoicePrintItem>,
    val subTotal: Double,
    val gstAmount: Double,
    val totalAmount: Double,
    val invoiceFooter: String?,
    val terms: List<String>
)

data class InvoicePrintItem(
    val productName: String,
    val quantity: Int,
    val rate: Double,
    val total: Double
)
