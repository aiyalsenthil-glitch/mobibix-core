package com.aiyal.mobibix.ui.features.whatsapp

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.CreateCampaignRequest
import com.aiyal.mobibix.data.network.SendMessageRequest
import com.aiyal.mobibix.data.network.WhatsappCampaign
import com.aiyal.mobibix.data.network.WhatsappTemplate
import com.aiyal.mobibix.domain.WhatsappRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WhatsappUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val templates: List<WhatsappTemplate> = emptyList(),
    val campaigns: List<WhatsappCampaign> = emptyList(),
    val messageSent: Boolean = false,
    val campaignCreated: Boolean = false
)

@HiltViewModel
class WhatsappViewModel @Inject constructor(
    private val repository: WhatsappRepository,
    private val shopContextProvider: ShopContextProvider
) : ViewModel() {

    private val _uiState = MutableStateFlow(WhatsappUiState())
    val uiState: StateFlow<WhatsappUiState> = _uiState.asStateFlow()

    fun loadTemplates() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val templates = repository.getTemplates(shopId)
                _uiState.value = _uiState.value.copy(isLoading = false, templates = templates)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun loadCampaigns() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val campaigns = repository.getCampaigns(shopId)
                _uiState.value = _uiState.value.copy(isLoading = false, campaigns = campaigns)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun sendMessage(phoneNumber: String, templateName: String, language: String = "en") {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, messageSent = false)
            try {
                val response = repository.sendMessage(
                    SendMessageRequest(shopId, phoneNumber, templateName, language)
                )
                if (response.success) {
                    _uiState.value = _uiState.value.copy(isLoading = false, messageSent = true)
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = response.error ?: "Message sending failed")
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun createCampaign(name: String, templateName: String, audienceFilter: String) {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, campaignCreated = false)
            try {
                repository.createCampaign(
                    CreateCampaignRequest(shopId, name, templateName, audienceFilter)
                )
                _uiState.value = _uiState.value.copy(isLoading = false, campaignCreated = true)
                loadCampaigns() // Reload campaigns
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun clearMessageSent() {
        _uiState.value = _uiState.value.copy(messageSent = false)
    }

    fun clearCampaignCreated() {
        _uiState.value = _uiState.value.copy(campaignCreated = false)
    }
}
