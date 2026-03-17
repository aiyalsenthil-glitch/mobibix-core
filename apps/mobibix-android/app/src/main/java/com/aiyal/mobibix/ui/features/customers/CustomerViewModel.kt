package com.aiyal.mobibix.ui.features.customers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.ui.UiMessageBus
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.dto.CreateCustomerRequest
import com.aiyal.mobibix.data.network.dto.CustomerResponse
import com.aiyal.mobibix.domain.CustomerRepository
import com.aiyal.mobibix.data.repository.CrmRepository
import com.aiyal.mobibix.data.network.TimelineEvent
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CustomerViewModel @Inject constructor(
    private val repository: CustomerRepository,
    private val crmRepository: CrmRepository,
    private val uiMessageBus: UiMessageBus
) : ViewModel() {

    private val _uiState = MutableStateFlow(CustomerUiState())
    val uiState: StateFlow<CustomerUiState> = _uiState.asStateFlow()

    fun loadCustomers(search: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            try {
                val response = repository.listCustomers(skip = 0, take = 50, search = search)
                _uiState.value = _uiState.value.copy(loading = false, customers = response.data)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(loading = false, error = msg)
            }
        }
    }

    fun loadCustomerDetail(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            try {
                val customer = repository.getCustomer(id)
                _uiState.value = _uiState.value.copy(loading = false, selectedCustomer = customer)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(loading = false, error = msg)
            }
        }
    }

    fun createCustomer(name: String, phone: String, email: String?, address: String, businessType: String, partyType: String, gst: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(operationLoading = true)
            try {
                repository.createCustomer(
                    CreateCustomerRequest(
                        name = name, phone = phone, email = email,
                        state = address, businessType = businessType,
                        partyType = partyType, gstNumber = gst
                    )
                )
                _uiState.value = _uiState.value.copy(operationLoading = false, operationSuccess = true, error = null)
                loadCustomers()
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(operationLoading = false, operationSuccess = false, error = msg)
            }
        }
    }

    fun loadCustomerTimeline(customerId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            try {
                val timeline = crmRepository.getCustomerTimeline(customerId)
                _uiState.value = _uiState.value.copy(loading = false, timelineEvents = timeline)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(loading = false, error = msg)
            }
        }
    }

    fun resetOperationState() {
        _uiState.value = _uiState.value.copy(operationSuccess = false, error = null)
    }
}

data class CustomerUiState(
    val loading: Boolean = false,
    val operationLoading: Boolean = false,
    val customers: List<CustomerResponse> = emptyList(),
    val selectedCustomer: CustomerResponse? = null,
    val timelineEvents: List<TimelineEvent> = emptyList(),
    val error: String? = null,
    val operationSuccess: Boolean = false
)
