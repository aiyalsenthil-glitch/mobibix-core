package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.DashboardApi
import com.aiyal.mobibix.data.network.OwnerDashboardResponse
import com.aiyal.mobibix.data.network.StaffDashboardResponse
import com.aiyal.mobibix.domain.DashboardRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DashboardRepositoryImpl @Inject constructor(
    private val api: DashboardApi
) : DashboardRepository {

    override suspend fun getOwnerDashboard(shopId: String?): OwnerDashboardResponse {
        return api.getOwnerDashboard(shopId)
    }

    override suspend fun getStaffDashboard(): StaffDashboardResponse {
        return api.getStaffDashboard()
    }
}
