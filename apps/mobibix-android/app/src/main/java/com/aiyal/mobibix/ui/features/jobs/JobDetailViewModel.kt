package com.aiyal.mobibix.ui.features.jobs

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.data.network.AddAdvanceRequest
import com.aiyal.mobibix.data.network.AddPartRequest
import com.aiyal.mobibix.data.network.JobCardResponse
import com.aiyal.mobibix.data.network.RefundDetails
import com.aiyal.mobibix.data.network.ShopDetails
import com.aiyal.mobibix.data.network.dto.UpdateJobRequest
import com.aiyal.mobibix.domain.JobRepository
import com.aiyal.mobibix.domain.ShopRepository
import com.aiyal.mobibix.model.JobStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class JobDetailViewModel @Inject constructor(
    private val jobRepository: JobRepository,
    private val shopRepository: ShopRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(JobDetailUiState())
    val uiState: StateFlow<JobDetailUiState> = _uiState.asStateFlow()

    fun loadJobDetails(shopId: String, jobId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            try {
                val job = jobRepository.getJobDetails(shopId, jobId)
                val shop = shopRepository.getShop(shopId)
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    job = job,
                    shop = shop,
                    error = null
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to load job details"
                )
            }
        }
    }

    /**
     * Update job status. If the job has an active advance (advancePaid > 0) and the
     * new status is terminal (CANCELLED / RETURNED / SCRAPPED), caller must provide
     * [refundDetails] — this matches the backend requirement.
     */
    fun updateStatus(
        shopId: String,
        jobId: String,
        status: JobStatus,
        refundDetails: RefundDetails? = null,
        reason: String? = null
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            try {
                jobRepository.updateStatus(shopId, jobId, status.name, refundDetails, reason)
                loadJobDetails(shopId, jobId)
                _uiState.value = _uiState.value.copy(
                    successMessage = "Status updated to ${status.name.replace("_", " ")}"
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to update status"
                )
            }
        }
    }

    fun updateJob(shopId: String, jobId: String, request: UpdateJobRequest) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true)
            try {
                jobRepository.updateJob(shopId, jobId, request)
                loadJobDetails(shopId, jobId)
                _uiState.value = _uiState.value.copy(successMessage = "Job details saved")
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to update job"
                )
            }
        }
    }

    fun addPart(shopId: String, jobId: String, shopProductId: String, quantity: Int) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(partsLoading = true, error = null)
            try {
                val updated = jobRepository.addPart(shopId, jobId, AddPartRequest(shopProductId, quantity))
                _uiState.value = _uiState.value.copy(
                    partsLoading = false,
                    job = updated,
                    successMessage = "Part added"
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    partsLoading = false,
                    error = e.message ?: "Failed to add part"
                )
            }
        }
    }

    fun removePart(shopId: String, jobId: String, partId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(partsLoading = true, error = null)
            try {
                val updated = jobRepository.removePart(shopId, jobId, partId)
                _uiState.value = _uiState.value.copy(
                    partsLoading = false,
                    job = updated,
                    successMessage = "Part removed, stock restored"
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    partsLoading = false,
                    error = e.message ?: "Failed to remove part"
                )
            }
        }
    }

    fun addAdvance(shopId: String, jobId: String, amount: Double, mode: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(partsLoading = true, error = null)
            try {
                val updated = jobRepository.addAdvance(shopId, jobId, AddAdvanceRequest(amount, mode))
                _uiState.value = _uiState.value.copy(
                    partsLoading = false,
                    job = updated,
                    successMessage = "Advance of ₹$amount recorded"
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    partsLoading = false,
                    error = e.message ?: "Failed to record advance"
                )
            }
        }
    }

    fun createWarrantyJob(shopId: String, jobId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            try {
                jobRepository.createWarrantyJob(shopId, jobId)
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    successMessage = "Warranty job created successfully"
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to create warranty job"
                )
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(successMessage = null, error = null)
    }
}

data class JobDetailUiState(
    val loading: Boolean = false,
    val partsLoading: Boolean = false,
    val job: JobCardResponse? = null,
    val shop: ShopDetails? = null,
    val error: String? = null,
    val successMessage: String? = null
)
