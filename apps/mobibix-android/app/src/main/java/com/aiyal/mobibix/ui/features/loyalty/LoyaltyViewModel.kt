package com.aiyal.mobibix.ui.features.loyalty

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.AddPointsRequest
import com.aiyal.mobibix.data.network.LoyaltyHistoryItem
import com.aiyal.mobibix.data.network.LoyaltySummary
import com.aiyal.mobibix.data.network.RedeemPointsRequest
import com.aiyal.mobibix.data.network.LoyaltyConfig
import com.aiyal.mobibix.domain.LoyaltyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoyaltyUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val summary: LoyaltySummary? = null,
    val history: List<LoyaltyHistoryItem> = emptyList(),
    val actionSuccess: String? = null,
    val config: LoyaltyConfig? = null,
    val isSavingConfig: Boolean = false
)

@HiltViewModel
class LoyaltyViewModel @Inject constructor(
    private val repository: LoyaltyRepository,
    private val shopContextProvider: ShopContextProvider
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoyaltyUiState())
    val uiState: StateFlow<LoyaltyUiState> = _uiState.asStateFlow()

    fun loadData() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val summary = repository.getLoyaltySummary(shopId)
                val history = repository.getLoyaltyHistory(shopId)
                _uiState.value = _uiState.value.copy(isLoading = false, summary = summary, history = history)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun addPoints(customerId: String, points: Int, description: String?) {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, actionSuccess = null)
            try {
                val response = repository.addPoints(AddPointsRequest(shopId, customerId, points, description))
                if (response.success) {
                    _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = "Points added successfully")
                    loadData()
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = response.message ?: "Failed to add points")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun redeemPoints(customerId: String, points: Int, description: String?) {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, actionSuccess = null)
            try {
                val response = repository.redeemPoints(RedeemPointsRequest(shopId, customerId, points, description))
                if (response.success) {
                    _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = "Points redeemed successfully")
                    loadData()
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = response.message ?: "Failed to redeem points")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun loadConfig() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val config = repository.getLoyaltyConfig()
                _uiState.value = _uiState.value.copy(isLoading = false, config = config)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun saveConfig(config: LoyaltyConfig) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSavingConfig = true, error = null, actionSuccess = null)
            try {
                val response = repository.updateLoyaltyConfig(config)
                if (response.success) {
                    _uiState.value = _uiState.value.copy(isSavingConfig = false, config = response.config, actionSuccess = "Loyalty settings saved")
                } else {
                    _uiState.value = _uiState.value.copy(isSavingConfig = false, error = "Failed to save loyalty settings")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isSavingConfig = false, error = e.message)
            }
        }
    }

    fun clearActionSuccess() {
        _uiState.value = _uiState.value.copy(actionSuccess = null)
    }
}
