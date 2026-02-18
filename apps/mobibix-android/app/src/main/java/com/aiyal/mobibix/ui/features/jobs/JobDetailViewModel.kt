package com.aiyal.mobibix.ui.features.jobs

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.data.network.JobCardResponse
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
            _uiState.value = _uiState.value.copy(loading = true)
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

    fun updateStatus(shopId: String, jobId: String, status: JobStatus) {
        viewModelScope.launch {
            try {
                jobRepository.updateStatus(shopId, jobId, status.name)
                loadJobDetails(shopId, jobId) // Refresh to get latest state/history
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message ?: "Failed to update status")
            }
        }
    }

    fun updateJob(shopId: String, jobId: String, request: UpdateJobRequest) {
        viewModelScope.launch {
             _uiState.value = _uiState.value.copy(loading = true)
            try {
                jobRepository.updateJob(shopId, jobId, request)
                loadJobDetails(shopId, jobId)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to update job"
                )
            }
        }
    }
}

data class JobDetailUiState(
    val loading: Boolean = false,
    val job: JobCardResponse? = null,
    val shop: ShopDetails? = null,
    val error: String? = null
)
