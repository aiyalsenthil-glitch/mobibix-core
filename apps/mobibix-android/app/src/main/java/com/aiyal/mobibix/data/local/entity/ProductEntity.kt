package com.aiyal.mobibix.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey
    val id: String,
    val shopId: String,
    val name: String,
    val category: String?,
    val salePrice: Int?, // paise
    val costPrice: Int?, // paise
    val stockQty: Int,
    val sku: String?,
    val updatedAt: Long = System.currentTimeMillis()
)
