package com.aiyal.mobibix.ui.features.jobs

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.ui.UiMessageBus
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.dto.CreateJobRequest
import com.aiyal.mobibix.domain.JobRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CreateJobViewModel @Inject constructor(
    private val repository: JobRepository,
    private val uiMessageBus: UiMessageBus
) : ViewModel() {

    private val _uiState = MutableStateFlow(CreateJobUiState())
    val uiState: StateFlow<CreateJobUiState> = _uiState.asStateFlow()

    fun updateFormData(newData: CreateJobFormData) {
        _uiState.value = _uiState.value.copy(formData = newData)
    }

    fun submitJob(shopId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            try {
                val formData = _uiState.value.formData
                val request = CreateJobRequest(
                    customerName = formData.customerName,
                    customerPhone = formData.customerPhone,
                    customerAltPhone = formData.customerAltPhone.takeIf { it.isNotBlank() },
                    deviceBrand = formData.deviceBrand,
                    deviceModel = formData.deviceModel,
                    deviceType = formData.deviceType,
                    deviceSerial = formData.deviceSerial.takeIf { it.isNotBlank() },
                    customerComplaint = formData.customerComplaint,
                    physicalCondition = formData.physicalCondition.takeIf { it.isNotBlank() },
                    estimatedCost = formData.estimatedCost.toDoubleOrNull(),
                    advancePaid = formData.advancePaid.toDoubleOrNull() ?: 0.0,
                    estimatedDelivery = formData.estimatedDelivery.takeIf { it.isNotBlank() }
                )
                repository.createJob(shopId, request)
                _uiState.value = _uiState.value.copy(loading = false, success = true)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(loading = false, error = msg)
            }
        }
    }

    fun resetState() {
        _uiState.value = CreateJobUiState()
    }
}

data class CreateJobUiState(
    val loading: Boolean = false,
    val success: Boolean = false,
    val error: String? = null,
    val formData: CreateJobFormData = CreateJobFormData()
)

data class CreateJobFormData(
    val customerName: String = "",
    val customerPhone: String = "",
    val customerAltPhone: String = "",
    val deviceType: String = "",
    val deviceBrand: String = "",
    val deviceModel: String = "",
    val deviceSerial: String = "",
    val customerComplaint: String = "",
    val physicalCondition: String = "",
    val estimatedCost: String = "",
    val advancePaid: String = "0",
    val estimatedDelivery: String = ""
)
