package com.aiyal.mobibix.ui.features.finance.receipts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.core.ui.UiMessageBus
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.CreateReceiptRequest
import com.aiyal.mobibix.data.network.Receipt
import com.aiyal.mobibix.data.network.ReceiptType
import com.aiyal.mobibix.domain.ReceiptRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ReceiptUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val receipts: List<Receipt> = emptyList(),
    val actionSuccess: Boolean = false
)

@HiltViewModel
class ReceiptViewModel @Inject constructor(
    private val receiptRepository: ReceiptRepository,
    private val shopContextProvider: ShopContextProvider,
    private val uiMessageBus: UiMessageBus
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReceiptUiState())
    val uiState: StateFlow<ReceiptUiState> = _uiState.asStateFlow()

    fun loadReceipts() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val list = receiptRepository.getReceipts()
                _uiState.value = _uiState.value.copy(isLoading = false, receipts = list)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun createReceipt(name: String, amount: Double, method: String, type: ReceiptType, phone: String?, narration: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val shopId = shopContextProvider.activeShopIdFlow.value
                receiptRepository.createReceipt(
                    CreateReceiptRequest(
                        paymentMethod = method,
                        amount = amount.toInt(),
                        receiptType = type,
                        customerName = name,
                        shopId = shopId,
                        customerPhone = phone,
                        narration = narration
                    )
                )
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
                loadReceipts()
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
