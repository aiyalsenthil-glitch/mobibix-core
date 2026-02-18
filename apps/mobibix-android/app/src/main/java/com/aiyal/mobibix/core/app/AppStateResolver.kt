package com.aiyal.mobibix.core.app

import com.aiyal.mobibix.core.auth.TokenStore
import com.aiyal.mobibix.data.network.AcceptInviteRequest
import com.aiyal.mobibix.data.network.StaffApi
import com.aiyal.mobibix.data.network.UserApi
import javax.inject.Inject

class AppStateResolver @Inject constructor(
    private val userApi: UserApi,
    private val staffApi: StaffApi,
    private val tokenStore: TokenStore
) {
    suspend fun resolve(): AppState {
        var me = userApi.me()

        // If user has a pending invite, accept it and refetch the user profile
        me.inviteToken?.let {
            val response = staffApi.acceptInvite(AcceptInviteRequest(it))
            tokenStore.saveToken(response.accessToken)
            me = userApi.me() // Re-fetch user state
        }

        return when {
            me.tenantId == null -> AppState.TenantRequired
            me.role == "OWNER" -> AppState.Owner
            me.role == "STAFF" -> AppState.Staff(me.tenantId!!)
            else -> AppState.TenantRequired
        }
    }
}
