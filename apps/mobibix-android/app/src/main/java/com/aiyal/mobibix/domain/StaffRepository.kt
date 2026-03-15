package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.InviteResponse
import com.aiyal.mobibix.data.network.StaffResponse

interface StaffRepository {
    suspend fun getStaff(): List<StaffResponse>
    suspend fun getInvites(): List<InviteResponse>
    suspend fun inviteStaff(
        email: String,
        name: String,
        phone: String?,
        roleId: String,
        branchIds: List<String>,
        shopId: String?
    )
    suspend fun removeStaff(id: String)
    suspend fun revokeInvite(id: String)
}
