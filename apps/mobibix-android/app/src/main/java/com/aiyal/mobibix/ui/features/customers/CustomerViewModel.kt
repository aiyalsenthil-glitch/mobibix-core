package com.aiyal.mobibix.ui.features.customers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
    private val crmRepository: CrmRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(CustomerUiState())
    val uiState: StateFlow<CustomerUiState> = _uiState.asStateFlow()

    fun loadCustomers(search: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            try {
                val response = repository.listCustomers(skip = 0, take = 50, search = search)
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    customers = response.data
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to load customers"
                )
            }
        }
    }

    fun loadCustomerDetail(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            try {
                val customer = repository.getCustomer(id)
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    selectedCustomer = customer
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to load customer details"
                )
            }
        }
    }

    fun createCustomer(name: String, phone: String, email: String?, address: String, businessType: String, partyType: String, gst: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(operationLoading = true)
            try {
                val request = CreateCustomerRequest(
                    name = name,
                    phone = phone,
                    email = email,
                    state = address, // Mapping address to state for now, assuming state field is used for address/state
                    businessType = businessType,
                    partyType = partyType,
                    gstNumber = gst
                )
                repository.createCustomer(request)
                _uiState.value = _uiState.value.copy(
                    operationLoading = false,
                    operationSuccess = true,
                    error = null
                )
                loadCustomers() // Refresh list
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    operationLoading = false,
                    operationSuccess = false,
                    error = e.message ?: "Failed to create customer"
                )
            }
        }
    }

    fun loadCustomerTimeline(customerId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            try {
                val timeline = crmRepository.getCustomerTimeline(customerId)
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    timelineEvents = timeline
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to load timeline"
                )
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
