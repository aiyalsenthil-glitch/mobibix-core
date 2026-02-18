package com.aiyal.mobibix.ui.features.billing

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.BillingInvoice
import com.aiyal.mobibix.data.network.SubscriptionPlan
import com.aiyal.mobibix.data.network.UpgradePlanRequest
import com.aiyal.mobibix.domain.BillingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BillingUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val currentPlan: SubscriptionPlan? = null,
    val availablePlans: List<SubscriptionPlan> = emptyList(),
    val invoices: List<BillingInvoice> = emptyList(),
    val upgradeSuccess: Boolean = false
)

@HiltViewModel
class BillingViewModel @Inject constructor(
    private val repository: BillingRepository,
    private val shopContextProvider: ShopContextProvider
) : ViewModel() {

    private val _uiState = MutableStateFlow(BillingUiState())
    val uiState: StateFlow<BillingUiState> = _uiState.asStateFlow()

    fun loadData() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val currentPlan = repository.getCurrentPlan(shopId)
                val plans = repository.getSubscriptionPlans()
                val invoices = repository.getInvoices(shopId)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    currentPlan = currentPlan,
                    availablePlans = plans,
                    invoices = invoices
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun upgradePlan(planId: String) {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, upgradeSuccess = false)
            try {
                val response = repository.upgradePlan(UpgradePlanRequest(shopId, planId))
                if (response.success) {
                    _uiState.value = _uiState.value.copy(isLoading = false, upgradeSuccess = true)
                    loadData()
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = response.message ?: "Upgrade failed")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun clearUpgradeSuccess() {
        _uiState.value = _uiState.value.copy(upgradeSuccess = false)
    }
}
