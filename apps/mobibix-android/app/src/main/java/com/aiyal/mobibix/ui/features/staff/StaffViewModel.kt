package com.aiyal.mobibix.ui.features.staff

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.data.network.InviteResponse
import com.aiyal.mobibix.data.network.StaffResponse
import com.aiyal.mobibix.domain.StaffRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StaffUiState(
    val isLoading: Boolean = false,
    val staff: List<StaffResponse> = emptyList(),
    val invites: List<InviteResponse> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class StaffViewModel @Inject constructor(
    private val staffRepository: StaffRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(StaffUiState())
    val uiState: StateFlow<StaffUiState> = _uiState.asStateFlow()

    fun loadStaff() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val staff = staffRepository.getStaff()
                val invites = staffRepository.getInvites()
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    staff = staff,
                    invites = invites
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load staff"
                )
            }
        }
    }

    fun removeStaff(id: String) {
        viewModelScope.launch {
            try {
                staffRepository.removeStaff(id)
                loadStaff()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }

    fun revokeInvite(id: String) {
        viewModelScope.launch {
            try {
                staffRepository.revokeInvite(id)
                loadStaff()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }
}
