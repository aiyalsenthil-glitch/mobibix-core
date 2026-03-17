package com.aiyal.mobibix.ui.features.crm

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.core.ui.UiMessageBus
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.CreateFollowUpRequest
import com.aiyal.mobibix.data.network.CrmDashboardStats
import com.aiyal.mobibix.data.network.FollowUp
import com.aiyal.mobibix.data.repository.CrmRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CrmUiState(
    val stats: CrmDashboardStats? = null,
    val followUps: List<FollowUp> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSaving: Boolean = false
)

@HiltViewModel
class CrmViewModel @Inject constructor(
    private val repository: CrmRepository,
    private val shopContextProvider: ShopContextProvider,
    private val uiMessageBus: UiMessageBus
) : ViewModel() {

    private val _uiState = MutableStateFlow(CrmUiState())
    val uiState: StateFlow<CrmUiState> = _uiState.asStateFlow()

    fun loadData() {
        val shopId = shopContextProvider.getActiveShopId() ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val stats = repository.getStats(shopId)
                val followUps = repository.getFollowUps(shopId, status = "PENDING")
                _uiState.value = _uiState.value.copy(stats = stats, followUps = followUps, isLoading = false)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun completeFollowUp(id: String) {
        viewModelScope.launch {
            try {
                repository.completeFollowUp(id)
                loadData()
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(error = msg)
            }
        }
    }

    fun createFollowUp(customerId: String, type: String, dueDate: String, note: String, priority: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            try {
                repository.createFollowUp(CreateFollowUpRequest(customerId, type, dueDate, note, priority))
                onSuccess()
                loadData()
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(error = msg, isSaving = false)
            }
        }
    }
}
