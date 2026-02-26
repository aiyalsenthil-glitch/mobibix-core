package com.aiyal.mobibix.core.di

import android.content.Context
import androidx.room.Room
import com.aiyal.mobibix.data.local.MobibixDatabase
import com.aiyal.mobibix.data.local.dao.ProductDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideRoomDatabase(
        @ApplicationContext context: Context
    ): MobibixDatabase {
        return Room.databaseBuilder(
            context,
            MobibixDatabase::class.java,
            "mobibix_db"
        ).fallbackToDestructiveMigration().build()
    }

    @Provides
    @Singleton
    fun provideProductDao(db: MobibixDatabase): ProductDao {
        return db.productDao()
    }
}
