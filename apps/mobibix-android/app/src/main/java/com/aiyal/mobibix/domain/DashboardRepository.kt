package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.OwnerDashboardResponse
import com.aiyal.mobibix.data.network.StaffDashboardResponse

interface DashboardRepository {
    suspend fun getOwnerDashboard(shopId: String? = null): OwnerDashboardResponse
    suspend fun getStaffDashboard(): StaffDashboardResponse
}
