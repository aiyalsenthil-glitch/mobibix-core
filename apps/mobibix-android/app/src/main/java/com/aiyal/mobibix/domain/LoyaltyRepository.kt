package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.AddPointsRequest
import com.aiyal.mobibix.data.network.LoyaltyApi
import com.aiyal.mobibix.data.network.LoyaltyHistoryItem
import com.aiyal.mobibix.data.network.LoyaltySummary
import com.aiyal.mobibix.data.network.LoyaltyConfig
import com.aiyal.mobibix.data.network.UpdateLoyaltyConfigResponse
import com.aiyal.mobibix.data.network.RedeemPointsRequest
import com.aiyal.mobibix.data.network.ResponseStatus
import javax.inject.Inject
import javax.inject.Singleton

interface LoyaltyRepository {
    suspend fun getLoyaltySummary(shopId: String): LoyaltySummary
    suspend fun getLoyaltyHistory(shopId: String): List<LoyaltyHistoryItem>
    suspend fun addPoints(request: AddPointsRequest): ResponseStatus
    suspend fun redeemPoints(request: RedeemPointsRequest): ResponseStatus
    suspend fun getLoyaltyConfig(): LoyaltyConfig
    suspend fun updateLoyaltyConfig(config: LoyaltyConfig): UpdateLoyaltyConfigResponse
}

@Singleton
class LoyaltyRepositoryImpl @Inject constructor(
    private val api: LoyaltyApi
) : LoyaltyRepository {
    override suspend fun getLoyaltySummary(shopId: String): LoyaltySummary =
        api.getLoyaltySummary(shopId)

    override suspend fun getLoyaltyHistory(shopId: String): List<LoyaltyHistoryItem> =
        api.getLoyaltyHistory(shopId)

    override suspend fun addPoints(request: AddPointsRequest): ResponseStatus =
        api.addPoints(request)

    override suspend fun redeemPoints(request: RedeemPointsRequest): ResponseStatus =
        api.redeemPoints(request)
        
    override suspend fun getLoyaltyConfig(): LoyaltyConfig =
        api.getLoyaltyConfig()
        
    override suspend fun updateLoyaltyConfig(config: LoyaltyConfig): UpdateLoyaltyConfigResponse =
        api.updateLoyaltyConfig(config)
}
