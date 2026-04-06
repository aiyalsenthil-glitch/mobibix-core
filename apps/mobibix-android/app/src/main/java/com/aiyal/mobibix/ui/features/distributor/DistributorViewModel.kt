package com.aiyal.mobibix.ui.features.distributor

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.ui.UiMessageBus
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DistributorDashboardState(
    val loading: Boolean = true,
    val analytics: DistributorAnalytics? = null,
    val orders: List<DistributorOrder> = emptyList(),
    val retailers: List<DistributorRetailer> = emptyList(),
    val profile: DistributorProfile? = null,
    val isRegistered: Boolean = true,
    val error: String? = null
)

data class DistributorRegisterState(
    val loading: Boolean = false,
    val success: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class DistributorViewModel @Inject constructor(
    private val distributorApi: DistributorApi,
    private val uiMessageBus: UiMessageBus
) : ViewModel() {

    private val _state = MutableStateFlow(DistributorDashboardState())
    val state: StateFlow<DistributorDashboardState> = _state.asStateFlow()

    private val _registerState = MutableStateFlow(DistributorRegisterState())
    val registerState: StateFlow<DistributorRegisterState> = _registerState.asStateFlow()

    init { loadDashboard() }

    fun loadDashboard() {
        viewModelScope.launch {
            _state.value = DistributorDashboardState(loading = true)
            try {
                val profile = try { distributorApi.getProfile() } catch (_: Exception) { null }
                if (profile == null) {
                    // 404 / 403 = not registered yet
                    _state.value = DistributorDashboardState(loading = false, isRegistered = false)
                    return@launch
                }
                val analytics = try { distributorApi.getAnalytics() } catch (_: Exception) { DistributorAnalytics() }
                val orders = try { distributorApi.getOrders() } catch (_: Exception) { emptyList() }
                val retailers = try { distributorApi.getRetailers() } catch (_: Exception) { emptyList() }
                _state.value = DistributorDashboardState(
                    loading = false, profile = profile,
                    analytics = analytics, orders = orders,
                    retailers = retailers, isRegistered = true
                )
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                _state.value = DistributorDashboardState(loading = false, error = msg)
            }
        }
    }

    fun register(name: String, referralCode: String) {
        viewModelScope.launch {
            _registerState.value = DistributorRegisterState(loading = true)
            try {
                distributorApi.register(DistributorRegisterRequest(name, referralCode))
                _registerState.value = DistributorRegisterState(loading = false, success = true)
                loadDashboard()
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _registerState.value = DistributorRegisterState(loading = false, error = msg)
            }
        }
    }

    fun confirmOrder(orderId: String) {
        viewModelScope.launch {
            try {
                distributorApi.updateOrderStatus(orderId, UpdateOrderStatusRequest("CONFIRMED"))
                loadDashboard()
            } catch (e: Exception) {
                uiMessageBus.showError(MobiError.extractMessage(e))
            }
        }
    }

    fun shipOrder(orderId: String) {
        viewModelScope.launch {
            try {
                distributorApi.updateOrderStatus(orderId, UpdateOrderStatusRequest("SHIPPED"))
                loadDashboard()
            } catch (e: Exception) {
                uiMessageBus.showError(MobiError.extractMessage(e))
            }
        }
    }
}
