package com.aiyal.mobibix.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.aiyal.mobibix.data.local.dao.CachedCustomerDao
import com.aiyal.mobibix.data.local.dao.CachedInvoiceDao
import com.aiyal.mobibix.data.local.dao.ProductDao
import com.aiyal.mobibix.data.local.entity.CachedCustomerEntity
import com.aiyal.mobibix.data.local.entity.CachedInvoiceEntity
import com.aiyal.mobibix.data.local.entity.ProductEntity

@Database(
    entities = [
        ProductEntity::class,
        CachedInvoiceEntity::class,
        CachedCustomerEntity::class
    ],
    version = 3,
    exportSchema = false
)
abstract class MobibixDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun cachedInvoiceDao(): CachedInvoiceDao
    abstract fun cachedCustomerDao(): CachedCustomerDao
}
