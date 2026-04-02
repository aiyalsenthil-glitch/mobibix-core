package com.aiyal.mobibix.ui.features.commission

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.core.ui.UiMessageBus
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.ApproveCommissionDto
import com.aiyal.mobibix.data.network.CommissionApi
import com.aiyal.mobibix.data.network.CommissionStatus
import com.aiyal.mobibix.data.network.CommissionSummary
import com.aiyal.mobibix.data.network.PayCommissionDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CommissionUiState(
    val isLoading: Boolean = false,
    val summary: CommissionSummary? = null,
    val selectedIds: Set<String> = emptySet(),
    val error: String? = null,
    val actionSuccess: Boolean = false,
    val activeFilter: CommissionStatus? = CommissionStatus.PENDING
)

@HiltViewModel
class CommissionViewModel @Inject constructor(
    private val commissionApi: CommissionApi,
    private val shopContextProvider: ShopContextProvider,
    private val uiMessageBus: UiMessageBus
) : ViewModel() {

    private val _uiState = MutableStateFlow(CommissionUiState())
    val uiState: StateFlow<CommissionUiState> = _uiState.asStateFlow()

    fun loadCommissions(status: CommissionStatus? = CommissionStatus.PENDING) {
        val shopId = shopContextProvider.getActiveShopId() ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, activeFilter = status)
            try {
                val summary = commissionApi.listCommissions(shopId, status = status)
                _uiState.value = _uiState.value.copy(isLoading = false, summary = summary)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun toggleSelection(id: String) {
        val current = _uiState.value.selectedIds.toMutableSet()
        if (id in current) current.remove(id) else current.add(id)
        _uiState.value = _uiState.value.copy(selectedIds = current)
    }

    fun approveSelected() {
        val shopId = shopContextProvider.getActiveShopId() ?: return
        val ids = _uiState.value.selectedIds.toList()
        if (ids.isEmpty()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            try {
                commissionApi.approveCommissions(shopId, ApproveCommissionDto(ids))
                uiMessageBus.showSuccess("${ids.size} commission(s) approved")
                _uiState.value = _uiState.value.copy(selectedIds = emptySet(), actionSuccess = true)
                loadCommissions(_uiState.value.activeFilter)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun paySelected(method: String, reference: String?) {
        val shopId = shopContextProvider.getActiveShopId() ?: return
        val ids = _uiState.value.selectedIds.toList()
        if (ids.isEmpty()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            try {
                commissionApi.payCommissions(shopId, PayCommissionDto(ids, method, reference))
                uiMessageBus.showSuccess("${ids.size} commission(s) marked as paid")
                _uiState.value = _uiState.value.copy(selectedIds = emptySet(), actionSuccess = true)
                loadCommissions(_uiState.value.activeFilter)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun resetActionSuccess() {
        _uiState.value = _uiState.value.copy(actionSuccess = false)
    }
}
