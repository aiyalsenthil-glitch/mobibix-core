package com.aiyal.mobibix.ui.features.approvals

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.domain.model.ApprovalRequest
import com.aiyal.mobibix.domain.repository.ApprovalRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class ApprovalUiState {
    object Loading : ApprovalUiState()
    data class Success(val requests: List<ApprovalRequest>) : ApprovalUiState()
    data class Error(val message: String) : ApprovalUiState()
}

@HiltViewModel
class ApprovalViewModel @Inject constructor(
    private val repository: ApprovalRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<ApprovalUiState>(ApprovalUiState.Loading)
    val uiState: StateFlow<ApprovalUiState> = _uiState.asStateFlow()

    private val _processingIds = MutableStateFlow<Set<String>>(emptySet())
    val processingIds: StateFlow<Set<String>> = _processingIds.asStateFlow()

    init {
        loadPendingApprovals()
    }

    fun loadPendingApprovals() {
        viewModelScope.launch {
            _uiState.value = ApprovalUiState.Loading
            try {
                val requests = repository.listPendingApprovals()
                _uiState.value = ApprovalUiState.Success(requests)
            } catch (e: Exception) {
                _uiState.value = ApprovalUiState.Error(e.message ?: "Failed to load approvals")
            }
        }
    }

    fun resolveApproval(id: String, approved: Boolean, comment: String? = null) {
        viewModelScope.launch {
            _processingIds.value = _processingIds.value + id
            try {
                repository.resolveApproval(id, approved, comment)
                // Refresh list on success
                loadPendingApprovals()
            } catch (e: Exception) {
                // In a real app we might show a Toast or Snackbar here
                _uiState.value = ApprovalUiState.Error(e.message ?: "Failed to resolve approval")
            } finally {
                _processingIds.value = _processingIds.value - id
            }
        }
    }
}
