package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.AddPointsRequest
import com.aiyal.mobibix.data.network.LoyaltyApi
import com.aiyal.mobibix.data.network.LoyaltyHistoryItem
import com.aiyal.mobibix.data.network.LoyaltySummary
import com.aiyal.mobibix.data.network.LoyaltyConfig
import com.aiyal.mobibix.data.network.ManualAdjustmentRequest
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

    // Map transactions → LoyaltyHistoryItem for UI compatibility
    override suspend fun getLoyaltyHistory(shopId: String): List<LoyaltyHistoryItem> {
        val response = api.getTransactions(shopId)
        return response.transactions.map { tx ->
            LoyaltyHistoryItem(
                id = tx.id,
                customerName = tx.customerName ?: "Unknown",
                date = tx.createdAt ?: "",
                type = tx.type,
                points = tx.points,
                description = tx.description
            )
        }
    }

    // Add points via manual-adjustment (positive points)
    override suspend fun addPoints(request: AddPointsRequest): ResponseStatus =
        api.manualAdjustment(
            ManualAdjustmentRequest(
                customerId = request.customerId,
                points = request.points,
                reason = request.description ?: "Manual add",
                shopId = request.shopId
            )
        )

    // Redeem points via manual-adjustment (negative points)
    override suspend fun redeemPoints(request: RedeemPointsRequest): ResponseStatus =
        api.manualAdjustment(
            ManualAdjustmentRequest(
                customerId = request.customerId,
                points = -request.points,
                reason = request.description ?: "Manual redeem",
                shopId = request.shopId
            )
        )

    override suspend fun getLoyaltyConfig(): LoyaltyConfig =
        api.getLoyaltyConfig()

    override suspend fun updateLoyaltyConfig(config: LoyaltyConfig): UpdateLoyaltyConfigResponse {
        val response = api.updateLoyaltyConfig(config)
        return UpdateLoyaltyConfigResponse(
            success = response.success,
            config = response.config ?: config
        )
    }
}
