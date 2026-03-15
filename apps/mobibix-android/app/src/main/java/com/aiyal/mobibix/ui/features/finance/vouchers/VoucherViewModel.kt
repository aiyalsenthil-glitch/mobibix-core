package com.aiyal.mobibix.ui.features.finance.vouchers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.data.network.CreateVoucherRequest
import com.aiyal.mobibix.data.network.PaymentVoucher
import com.aiyal.mobibix.data.network.VoucherType
import com.aiyal.mobibix.domain.VoucherRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class VoucherUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val vouchers: List<PaymentVoucher> = emptyList(),
    val actionSuccess: Boolean = false
)

@HiltViewModel
class VoucherViewModel @Inject constructor(
    private val voucherRepository: VoucherRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(VoucherUiState())
    val uiState: StateFlow<VoucherUiState> = _uiState.asStateFlow()

    fun loadVouchers() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val list = voucherRepository.getVouchers()
                _uiState.value = _uiState.value.copy(isLoading = false, vouchers = list)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun createVoucher(amount: Double, method: String, type: VoucherType, narration: String?, category: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                voucherRepository.createVoucher(
                    CreateVoucherRequest(
                        paymentMethod = method,
                        amount = amount,
                        voucherType = type,
                        narration = narration,
                        expenseCategory = category
                    )
                )
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
                loadVouchers()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun resetActionSuccess() {
        _uiState.value = _uiState.value.copy(actionSuccess = false)
    }
}
