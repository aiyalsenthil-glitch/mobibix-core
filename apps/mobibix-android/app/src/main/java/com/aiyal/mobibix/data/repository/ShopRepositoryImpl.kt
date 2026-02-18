package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.ShopApi
import com.aiyal.mobibix.data.network.ShopDetails
import com.aiyal.mobibix.data.network.UpdateShopSettingsRequest
import com.aiyal.mobibix.domain.ShopRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ShopRepositoryImpl @Inject constructor(
    private val api: ShopApi
) : ShopRepository {
    override suspend fun getMyShops(): List<com.aiyal.mobibix.data.network.Shop> {
        return api.getMyShops().data
    }

    override suspend fun getShop(shopId: String): ShopDetails {
        return api.getShop(shopId)
    }

    override suspend fun updateShopSettings(shopId: String, request: UpdateShopSettingsRequest) {
        api.updateShopSettings(shopId, request)
    }
}
