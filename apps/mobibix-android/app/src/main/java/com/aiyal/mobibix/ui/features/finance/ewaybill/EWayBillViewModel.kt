package com.aiyal.mobibix.ui.features.finance.ewaybill

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.core.ui.UiMessageBus
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.EWayBill
import com.aiyal.mobibix.data.network.EWayBillApi
import com.aiyal.mobibix.data.network.EWayBillStatus
import com.aiyal.mobibix.data.network.GenerateEWayBillDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EWayBillUiState(
    val isLoading: Boolean = false,
    val bills: List<EWayBill> = emptyList(),
    val selectedBill: EWayBill? = null,
    val error: String? = null,
    val actionSuccess: Boolean = false,
    val isSaving: Boolean = false
)

@HiltViewModel
class EWayBillViewModel @Inject constructor(
    private val eWayBillApi: EWayBillApi,
    private val shopContextProvider: ShopContextProvider,
    private val uiMessageBus: UiMessageBus
) : ViewModel() {

    private val _uiState = MutableStateFlow(EWayBillUiState())
    val uiState: StateFlow<EWayBillUiState> = _uiState.asStateFlow()

    fun loadBills() {
        val shopId = shopContextProvider.getActiveShopId() ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val response = eWayBillApi.listEWayBills(shopId)
                _uiState.value = _uiState.value.copy(isLoading = false, bills = response.data)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun generateBill(
        recipientGstin: String,
        totalValue: Double,
        vehicleNumber: String?,
        distance: Int?,
        invoiceId: String?
    ) {
        val shopId = shopContextProvider.getActiveShopId() ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, error = null)
            try {
                val dto = GenerateEWayBillDto(
                    shopId = shopId,
                    invoiceId = invoiceId,
                    supplierGstin = null,
                    recipientGstin = recipientGstin,
                    totalValue = totalValue,
                    vehicleNumber = vehicleNumber?.ifBlank { null },
                    distance = distance,
                    transactionType = null,
                    subType = null
                )
                eWayBillApi.generateEWayBill(shopId, dto)
                uiMessageBus.showSuccess("E-Way Bill generated successfully")
                _uiState.value = _uiState.value.copy(isSaving = false, actionSuccess = true)
                loadBills()
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isSaving = false, error = msg)
            }
        }
    }

    fun cancelBill(id: String) {
        val shopId = shopContextProvider.getActiveShopId() ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            try {
                eWayBillApi.cancelEWayBill(shopId, id)
                uiMessageBus.showSuccess("E-Way Bill cancelled")
                loadBills()
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
