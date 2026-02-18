package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.CreateProductRequest
import com.aiyal.mobibix.data.network.ProductApi
import com.aiyal.mobibix.data.network.ProductListResponse
import com.aiyal.mobibix.data.network.ShopProduct
import com.aiyal.mobibix.data.network.StockCorrectionRequest
import com.aiyal.mobibix.data.network.StockInRequest
import com.aiyal.mobibix.data.network.UpdateProductRequest
import com.aiyal.mobibix.domain.ProductRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProductRepositoryImpl @Inject constructor(
    private val productApi: ProductApi
) : ProductRepository {

    override suspend fun getProducts(shopId: String, skip: Int, take: Int): ProductListResponse {
        return productApi.getProductsForShop(shopId, skip, take)
    }

    override suspend fun createProduct(request: CreateProductRequest): ShopProduct {
        return productApi.createProduct(request)
    }

    override suspend fun updateProduct(id: String, request: UpdateProductRequest): ShopProduct {
        return productApi.updateProduct(id, request)
    }

    override suspend fun stockIn(request: StockInRequest) {
        productApi.stockIn(request)
    }

    override suspend fun correctStock(request: StockCorrectionRequest) {
        productApi.correctStock(request)
    }
}
