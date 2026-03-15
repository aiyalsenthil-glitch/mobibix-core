package com.aiyal.mobibix.data.local.dao

import androidx.room.*
import com.aiyal.mobibix.data.local.entity.CachedInvoiceEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CachedInvoiceDao {

    @Query("SELECT * FROM cached_invoices WHERE shopId = :shopId ORDER BY invoiceDate DESC LIMIT 100")
    fun getInvoicesForShop(shopId: String): Flow<List<CachedInvoiceEntity>>

    @Query("SELECT * FROM cached_invoices WHERE shopId = :shopId AND (customerName LIKE '%' || :query || '%' OR invoiceNumber LIKE '%' || :query || '%') ORDER BY invoiceDate DESC LIMIT 50")
    suspend fun searchInvoices(shopId: String, query: String): List<CachedInvoiceEntity>

    @Query("SELECT * FROM cached_invoices WHERE id = :invoiceId")
    suspend fun getInvoiceById(invoiceId: String): CachedInvoiceEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(invoices: List<CachedInvoiceEntity>)

    @Query("DELETE FROM cached_invoices WHERE shopId = :shopId AND syncedAt < :olderThan")
    suspend fun deleteStale(shopId: String, olderThan: Long)

    @Query("SELECT COUNT(*) FROM cached_invoices WHERE shopId = :shopId")
    suspend fun count(shopId: String): Int
}
