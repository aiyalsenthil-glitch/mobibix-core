package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.ShopDetails
import com.aiyal.mobibix.data.network.UpdateShopSettingsRequest

interface ShopRepository {
    suspend fun getMyShops(): List<com.aiyal.mobibix.data.network.Shop>
    suspend fun getShop(shopId: String): ShopDetails
    suspend fun updateShopSettings(shopId: String, request: UpdateShopSettingsRequest)
}
