package com.aiyal.mobibix.ui.features.jobs

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
    private val repository: JobRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(JobListUiState())
    val uiState: StateFlow<JobListUiState> = _uiState.asStateFlow()

    private var allJobs: List<JobCardResponse> = emptyList()

    fun loadJobs(shopId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true)
            try {
                val jobs = repository.getJobs(shopId)
                allJobs = jobs
                applyFilters()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    error = e.message ?: "Failed to load jobs"
                )
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
                (job.deviceModel.contains(query, ignoreCase = true))
            }
            
            val matchesStatus = if (status == null) true else job.status == status
            
            matchesQuery && matchesStatus
        }

        _uiState.value = _uiState.value.copy(
            loading = false,
            jobs = filtered,
            error = null
        )
    }
}

data class JobListUiState(
    val loading: Boolean = false,
    val jobs: List<JobCardResponse> = emptyList(),
    val error: String? = null,
    val searchQuery: String = "",
    val statusFilter: JobStatus? = null
)
