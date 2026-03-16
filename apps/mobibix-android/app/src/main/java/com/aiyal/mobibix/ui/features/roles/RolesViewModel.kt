package com.aiyal.mobibix.ui.features.roles

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.ui.UiMessageBus
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.domain.model.Role
import com.aiyal.mobibix.domain.repository.RolesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class RolesUiState {
    object Loading : RolesUiState()
    data class Success(val roles: List<Role>) : RolesUiState()
    data class Error(val message: String) : RolesUiState()
}

@HiltViewModel
class RolesViewModel @Inject constructor(
    private val repository: RolesRepository,
    private val uiMessageBus: UiMessageBus
) : ViewModel() {

    private val _uiState = MutableStateFlow<RolesUiState>(RolesUiState.Loading)
    val uiState: StateFlow<RolesUiState> = _uiState.asStateFlow()

    init {
        loadRoles()
    }

    fun loadRoles() {
        viewModelScope.launch {
            _uiState.value = RolesUiState.Loading
            try {
                val roles = repository.listRoles()
                _uiState.value = RolesUiState.Success(roles)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = RolesUiState.Error(msg)
            }
        }
    }

    fun deleteRole(id: String) {
        viewModelScope.launch {
            try {
                repository.deleteRole(id)
                loadRoles()
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = RolesUiState.Error(msg)
            }
        }
    }
}
