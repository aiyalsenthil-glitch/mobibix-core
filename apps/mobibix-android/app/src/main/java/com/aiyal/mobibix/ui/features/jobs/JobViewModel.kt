package com.aiyal.mobibix.ui.features.jobs

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.ui.UiMessageBus
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.JobCardResponse
import com.aiyal.mobibix.domain.JobRepository
import com.aiyal.mobibix.model.JobStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class JobViewModel @Inject constructor(
    private val repository: JobRepository,
    private val uiMessageBus: UiMessageBus
) : ViewModel() {

    private val _uiState = MutableStateFlow(JobListUiState())
    val uiState: StateFlow<JobListUiState> = _uiState.asStateFlow()

    private var allJobs: List<JobCardResponse> = emptyList()

    fun loadJobs(shopId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            try {
                val jobs = repository.getJobs(shopId)
                allJobs = jobs
                applyFilters()
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(loading = false, error = msg)
            }
        }
    }

    fun onSearchQueryChanged(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        applyFilters()
    }

    fun onStatusFilterChanged(status: JobStatus?) {
        _uiState.value = _uiState.value.copy(statusFilter = status)
        applyFilters()
    }

    private fun applyFilters() {
        val query = _uiState.value.searchQuery
        val status = _uiState.value.statusFilter

        val filtered = allJobs.filter { job ->
            val matchesQuery = if (query.isBlank()) true else {
                job.jobNumber.contains(query, ignoreCase = true) ||
                job.customerName.contains(query, ignoreCase = true) ||
                job.customerPhone.contains(query, ignoreCase = true) ||
                job.deviceModel.contains(query, ignoreCase = true) ||
                (job.deviceSerial?.contains(query, ignoreCase = true) == true)
            }
            val matchesStatus = status == null || job.status == status
            matchesQuery && matchesStatus
        }

        _uiState.value = _uiState.value.copy(
            loading = false,
            jobs = allJobs,
            filteredJobs = filtered,
            error = null
        )
    }
}

data class JobListUiState(
    val loading: Boolean = false,
    val jobs: List<JobCardResponse> = emptyList(),
    val filteredJobs: List<JobCardResponse> = emptyList(),
    val error: String? = null,
    val searchQuery: String = "",
    val statusFilter: JobStatus? = null
)
