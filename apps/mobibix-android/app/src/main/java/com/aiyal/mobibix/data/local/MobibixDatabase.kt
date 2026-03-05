package com.aiyal.mobibix.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.aiyal.mobibix.data.local.dao.ProductDao
import com.aiyal.mobibix.data.local.entity.ProductEntity

@Database(
    entities = [
        ProductEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class MobibixDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
}
