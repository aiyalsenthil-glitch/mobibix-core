package com.aiyal.mobibix.ui.features.shop

import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.core.shop.ShopContextStore
import com.aiyal.mobibix.data.network.ShopApi
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@EntryPoint
@InstallIn(SingletonComponent::class)
interface ShopEntryPoint {
    fun shopApi(): ShopApi
    fun shopContextStore(): ShopContextStore
    fun shopContextProvider(): ShopContextProvider
}
