package com.aiyal.mobibix.ui.features.billing

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.BillingInvoice
import com.aiyal.mobibix.data.network.SubscriptionDetails
import com.aiyal.mobibix.data.network.Plan
import com.aiyal.mobibix.data.network.CreateOrderResponse
import com.aiyal.mobibix.data.network.VerifyPaymentRequest
import com.aiyal.mobibix.data.network.UpgradeSubscriptionRequest
import com.aiyal.mobibix.domain.BillingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BillingUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val currentPlan: SubscriptionDetails? = null,
    val availablePlans: List<Plan> = emptyList(),
    val invoices: List<BillingInvoice> = emptyList(),
    val upgradeSuccess: Boolean = false,
    val createOrderResponse: CreateOrderResponse? = null,
    val autoRenewLoading: Boolean = false,
    val selectedCycle: String = "MONTHLY",
    val billingType: String = "AUTOPAY"
)

sealed class BillingEvent {
    data class StartPayment(
        val key: String,
        val orderId: String,
        val amount: Int,
        val planId: String,
        val cycle: String
    ) : BillingEvent()
}

@HiltViewModel
class BillingViewModel @Inject constructor(
    private val repository: BillingRepository,
    private val shopContextProvider: ShopContextProvider
) : ViewModel() {

    private val _uiState = MutableStateFlow(BillingUiState())
    val uiState: StateFlow<BillingUiState> = _uiState.asStateFlow()

    private val _events = MutableSharedFlow<BillingEvent>()
    val events: SharedFlow<BillingEvent> = _events.asSharedFlow()

    fun loadData() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val currentPlan = repository.getSubscription()
                val plans = repository.getAvailablePlans()
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

    fun upgradePlan(planId: String, cycle: String = "MONTHLY", billingType: String = "AUTOPAY") {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, upgradeSuccess = false)
            try {
                val response = repository.upgradeSubscription(planId, cycle, billingType)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    createOrderResponse = response
                )
                
                // Trigger Payment Event
                _events.emit(BillingEvent.StartPayment(
                    key = response.key,
                    orderId = response.orderId,
                    amount = response.amount,
                    planId = planId,
                    cycle = cycle ?: "MONTHLY"
                ))
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun verifyPayment(paymentId: String, orderId: String, signature: String, planId: String, cycle: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val response = repository.verifyPayment(
                    VerifyPaymentRequest(orderId, paymentId, signature, planId, cycle)
                )
                if (response.success) {
                    _uiState.value = _uiState.value.copy(isLoading = false, upgradeSuccess = true)
                    loadData()
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = response.message ?: "Verification failed")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun toggleAutoRenew() {
        val currentAutoRenew = uiState.value.currentPlan?.autoRenew ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(autoRenewLoading = true)
            try {
                val success = repository.toggleAutoRenew(!currentAutoRenew)
                _uiState.value = _uiState.value.copy(
                    autoRenewLoading = false,
                    currentPlan = _uiState.value.currentPlan?.copy(autoRenew = success)
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(autoRenewLoading = false, error = e.message)
            }
        }
    }

    fun selectCycle(cycle: String) {
        _uiState.value = _uiState.value.copy(selectedCycle = cycle)
    }

    fun selectBillingType(type: String) {
        _uiState.value = _uiState.value.copy(billingType = type)
    }

    fun clearUpgradeSuccess() {
        _uiState.value = _uiState.value.copy(upgradeSuccess = false)
    }
}
