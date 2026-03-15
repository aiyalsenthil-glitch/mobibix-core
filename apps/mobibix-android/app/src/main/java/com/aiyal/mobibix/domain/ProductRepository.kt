package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.CreateProductRequest
import com.aiyal.mobibix.data.network.ProductListResponse
import com.aiyal.mobibix.data.network.ShopProduct
import com.aiyal.mobibix.data.network.StockCorrectionRequest
import com.aiyal.mobibix.data.network.StockInRequest
import com.aiyal.mobibix.data.network.UpdateProductRequest
import kotlinx.coroutines.flow.Flow

interface ProductRepository {
    fun getLocalProducts(shopId: String): Flow<List<ShopProduct>>
    suspend fun syncProducts(shopId: String)

    suspend fun getProducts(shopId: String, skip: Int = 0, take: Int = 50): ProductListResponse
    suspend fun createProduct(request: CreateProductRequest): ShopProduct
    suspend fun updateProduct(id: String, request: UpdateProductRequest): ShopProduct
    suspend fun stockIn(request: StockInRequest)
    suspend fun correctStock(request: StockCorrectionRequest)
}
