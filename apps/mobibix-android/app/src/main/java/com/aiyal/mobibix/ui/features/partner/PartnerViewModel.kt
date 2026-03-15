package com.aiyal.mobibix.ui.features.partner

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PartnerAuthState(
    val loading: Boolean = false,
    val token: String? = null,
    val profile: PartnerProfile? = null,
    val error: String? = null
)

data class PartnerDashboardState(
    val loading: Boolean = true,
    val stats: PartnerDashboardStats? = null,
    val referrals: List<PartnerReferral> = emptyList(),
    val payouts: List<PartnerPayoutHistory> = emptyList(),
    val tierInfo: List<PartnerTierInfo> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class PartnerViewModel @Inject constructor(
    private val partnerApi: PartnerApi
) : ViewModel() {

    private val _authState = MutableStateFlow(PartnerAuthState())
    val authState = _authState.asStateFlow()

    private val _dashboardState = MutableStateFlow(PartnerDashboardState())
    val dashboardState = _dashboardState.asStateFlow()

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _authState.value = PartnerAuthState(loading = true)
            try {
                val resp = partnerApi.login(PartnerLoginRequest(email, password))
                _authState.value = PartnerAuthState(loading = false, token = resp.token, profile = resp.partner)
            } catch (e: Exception) {
                _authState.value = PartnerAuthState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun loadDashboard() {
        viewModelScope.launch {
            _dashboardState.value = PartnerDashboardState(loading = true)
            try {
                val stats = partnerApi.getDashboardStats()
                val referrals = try { partnerApi.getReferrals() } catch (_: Exception) { emptyList() }
                val payouts = try { partnerApi.getPayoutHistory() } catch (_: Exception) { emptyList() }
                val tiers = try { partnerApi.getTierInfo() } catch (_: Exception) { emptyList() }
                _dashboardState.value = PartnerDashboardState(
                    loading = false, stats = stats,
                    referrals = referrals, payouts = payouts, tierInfo = tiers
                )
            } catch (e: Exception) {
                _dashboardState.value = PartnerDashboardState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun logout() {
        _authState.value = PartnerAuthState()
        _dashboardState.value = PartnerDashboardState()
    }
}
