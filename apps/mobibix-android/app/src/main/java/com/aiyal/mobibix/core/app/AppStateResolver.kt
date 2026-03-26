package com.aiyal.mobibix.core.app

import android.content.Context
import android.util.Log
import com.aiyal.mobibix.core.auth.TokenStore
import com.aiyal.mobibix.data.network.AcceptInviteRequest
import com.aiyal.mobibix.data.network.FcmTokenRequest
import com.aiyal.mobibix.data.network.StaffApi
import com.aiyal.mobibix.data.network.UserApi
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class AppStateResolver @Inject constructor(
    private val userApi: UserApi,
    private val staffApi: StaffApi,
    private val tokenStore: TokenStore,
    @ApplicationContext private val context: Context
) {
    suspend fun resolve(): AppState {
        var me = userApi.me()

        // If user has a pending invite, accept it and refetch the user profile
        me.inviteToken?.takeIf { it.isNotBlank() }?.let {
            val response = staffApi.acceptInvite(AcceptInviteRequest(it))
            tokenStore.saveToken(response.accessToken)
            me = userApi.me() // Re-fetch user state
        }

        // Register pending FCM token if the device issued a new token since last login
        val prefs = context.getSharedPreferences("mobi_fcm", Context.MODE_PRIVATE)
        val pendingToken = prefs.getString("pending_fcm_token", null)
        if (pendingToken != null) {
            try {
                userApi.registerFcmToken(FcmTokenRequest(pendingToken))
                prefs.edit().remove("pending_fcm_token").apply()
            } catch (e: Exception) {
                Log.w("AppStateResolver", "FCM token registration failed: ${e.message}")
                // Non-fatal — will retry on next login
            }
        }

        return when {
            me.tenantId.isNullOrBlank() -> AppState.TenantRequired
            me.isComingSoon == true -> AppState.ComingSoonBusiness
            me.isSystemOwner == true -> AppState.Owner(
                role = me.role,
                isSystemOwner = true,
                permissions = me.permissions ?: emptyList()
            )
            else -> AppState.Staff(
                shopId = me.tenantId, // Using tenantId for shopId temporarily, though this may change with multi-branch logic
                role = me.role,
                isSystemOwner = false,
                permissions = me.permissions ?: emptyList()
            )
        }
    }
}
