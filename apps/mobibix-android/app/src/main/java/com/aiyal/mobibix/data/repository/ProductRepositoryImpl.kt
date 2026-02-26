package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.CreateProductRequest
import com.aiyal.mobibix.data.network.ProductApi
import com.aiyal.mobibix.data.network.ProductListResponse
import com.aiyal.mobibix.data.network.ShopProduct
import com.aiyal.mobibix.data.network.StockCorrectionRequest
import com.aiyal.mobibix.data.network.StockInRequest
import com.aiyal.mobibix.data.network.UpdateProductRequest
import com.aiyal.mobibix.domain.ProductRepository
import com.aiyal.mobibix.data.local.dao.ProductDao
import com.aiyal.mobibix.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProductRepositoryImpl @Inject constructor(
    private val productApi: ProductApi,
    private val productDao: ProductDao
) : ProductRepository {

    override fun getLocalProducts(shopId: String): Flow<List<ShopProduct>> {
        return productDao.getProductsByShop(shopId).map { entities ->
            entities.map { entity ->
                ShopProduct(
                    id = entity.id,
                    name = entity.name,
                    category = entity.category,
                    salePrice = entity.salePrice,
                    costPrice = entity.costPrice,
                    stockQty = entity.stockQty,
                    sku = entity.sku
                )
            }
        }
    }

    override suspend fun syncProducts(shopId: String) {
        val remoteData = mutableListOf<ShopProduct>()
        var skip = 0
        val take = 100
        var hasMore = true
        while (hasMore) {
            val response = productApi.getProductsForShop(shopId, skip, take)
            remoteData.addAll(response.data)
            skip += take
            if (response.data.size < take) {
                hasMore = false
            }
        }
        val entities = remoteData.map { dto ->
            ProductEntity(
                id = dto.id,
                shopId = shopId,
                name = dto.name,
                category = dto.category,
                salePrice = dto.salePrice,
                costPrice = dto.costPrice,
                stockQty = dto.stockQty,
                sku = dto.sku
            )
        }
        productDao.updateShopProducts(shopId, entities)
    }

    override suspend fun getProducts(shopId: String, skip: Int, take: Int): ProductListResponse {
        return productApi.getProductsForShop(shopId, skip, take)
    }

    override suspend fun createProduct(request: CreateProductRequest): ShopProduct {
        val created = productApi.createProduct(request)
        productDao.insertOrReplace(listOf(
            ProductEntity(
                id = created.id,
                shopId = request.shopId,
                name = created.name,
                category = created.category,
                salePrice = created.salePrice,
                costPrice = created.costPrice,
                stockQty = created.stockQty,
                sku = created.sku
            )
        ))
        return created
    }

    override suspend fun updateProduct(id: String, request: UpdateProductRequest): ShopProduct {
        val updated = productApi.updateProduct(id, request)
        productDao.insertOrReplace(listOf(
            ProductEntity(
                id = updated.id,
                shopId = request.shopId,
                name = updated.name,
                category = updated.category,
                salePrice = updated.salePrice,
                costPrice = updated.costPrice,
                stockQty = updated.stockQty,
                sku = updated.sku
            )
        ))
        return updated
    }

    override suspend fun stockIn(request: StockInRequest) {
        productApi.stockIn(request)
    }

    override suspend fun correctStock(request: StockCorrectionRequest) {
        productApi.correctStock(request)
    }
}
