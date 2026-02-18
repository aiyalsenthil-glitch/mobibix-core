package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.InviteStaffRequest
import com.aiyal.mobibix.data.network.StaffApi
import com.aiyal.mobibix.data.network.StaffResponse
import com.aiyal.mobibix.data.network.InviteResponse
import com.aiyal.mobibix.domain.StaffRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StaffRepositoryImpl @Inject constructor(
    private val staffApi: StaffApi
) : StaffRepository {
    override suspend fun getStaff(): List<StaffResponse> {
        return staffApi.getStaff()
    }

    override suspend fun getInvites(): List<InviteResponse> {
        return staffApi.getInvites()
    }

    override suspend fun inviteStaff(email: String, role: String, shopId: String) {
        staffApi.invite(InviteStaffRequest(email, role, shopId))
    }

    override suspend fun removeStaff(id: String) {
        staffApi.removeStaff(id)
    }

    override suspend fun revokeInvite(id: String) {
        staffApi.revokeInvite(id)
    }
}
