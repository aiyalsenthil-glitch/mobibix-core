package com.aiyal.mobibix.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.aiyal.mobibix.data.local.entity.ProductEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Query("SELECT * FROM products WHERE shopId = :shopId ORDER BY name ASC")
    fun getProductsByShop(shopId: String): Flow<List<ProductEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrReplace(products: List<ProductEntity>)

    @Query("SELECT * FROM products WHERE id = :productId")
    suspend fun getProductById(productId: String): ProductEntity?

    @Query("DELETE FROM products WHERE shopId = :shopId")
    suspend fun clearShopProducts(shopId: String)

    @Transaction
    suspend fun updateShopProducts(shopId: String, products: List<ProductEntity>) {
        clearShopProducts(shopId)
        insertOrReplace(products)
    }
}
