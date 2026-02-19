package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.CreateFollowUpRequest
import com.aiyal.mobibix.data.network.CrmApi
import com.aiyal.mobibix.data.network.CrmDashboardStats
import com.aiyal.mobibix.data.network.FollowUp
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CrmRepository @Inject constructor(
    private val crmApi: CrmApi
) {
    suspend fun getStats(shopId: String): CrmDashboardStats {
        return crmApi.getDashboardStats(shopId)
    }

    suspend fun getFollowUps(shopId: String, status: String? = null): List<FollowUp> {
        return crmApi.getFollowUps(shopId, status)
    }

    suspend fun createFollowUp(request: CreateFollowUpRequest): FollowUp {
        return crmApi.createFollowUp(request)
    }

    suspend fun completeFollowUp(id: String) {
        crmApi.completeFollowUp(id)
    }
}
