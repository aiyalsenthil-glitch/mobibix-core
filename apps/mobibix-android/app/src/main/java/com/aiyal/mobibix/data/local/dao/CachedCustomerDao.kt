package com.aiyal.mobibix.data.local.dao

import androidx.room.*
import com.aiyal.mobibix.data.local.entity.CachedCustomerEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CachedCustomerDao {

    @Query("SELECT * FROM cached_customers WHERE shopId = :shopId ORDER BY name ASC")
    fun getCustomersForShop(shopId: String): Flow<List<CachedCustomerEntity>>

    @Query("SELECT * FROM cached_customers WHERE shopId = :shopId AND (name LIKE '%' || :query || '%' OR phone LIKE '%' || :query || '%') ORDER BY name ASC LIMIT 20")
    suspend fun searchCustomers(shopId: String, query: String): List<CachedCustomerEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(customers: List<CachedCustomerEntity>)

    @Query("DELETE FROM cached_customers WHERE shopId = :shopId")
    suspend fun clearForShop(shopId: String)
}
