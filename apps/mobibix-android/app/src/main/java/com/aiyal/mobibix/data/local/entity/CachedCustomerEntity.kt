package com.aiyal.mobibix.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Cached customer for offline autocomplete and quick access.
 */
@Entity(tableName = "cached_customers")
data class CachedCustomerEntity(
    @PrimaryKey
    val id: String,
    val shopId: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val gstin: String? = null,
    val totalPurchases: Double = 0.0,
    val outstandingBalance: Double = 0.0,
    val syncedAt: Long = System.currentTimeMillis()
)
