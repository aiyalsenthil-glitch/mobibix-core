package com.aiyal.mobibix.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Cached invoice for offline mode.
 * Populated by InvoiceSyncWorker; shown when network is unavailable.
 */
@Entity(tableName = "cached_invoices")
data class CachedInvoiceEntity(
    @PrimaryKey
    val id: String,
    val shopId: String,
    val invoiceNumber: String,
    val customerName: String,
    val customerPhone: String? = null,
    val totalAmount: Double,
    val paidAmount: Double = 0.0,
    val status: String, // DRAFT, CONFIRMED, PAID, etc.
    val paymentStatus: String? = null,
    val invoiceDate: String,
    val dueDate: String? = null,
    val itemsSummary: String? = null, // JSON-serialized items for offline display
    val syncedAt: Long = System.currentTimeMillis()
)
