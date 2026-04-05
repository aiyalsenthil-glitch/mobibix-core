package com.aiyal.mobibix.ui.features.roles

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.ui.UiMessageBus
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.domain.model.PermissionModule
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

sealed class RoleEditUiState {
    object Idle : RoleEditUiState()
    object Loading : RoleEditUiState()
    data class Ready(val role: Role?, val modules: List<PermissionModule>) : RoleEditUiState()
    object Saving : RoleEditUiState()
    object Saved : RoleEditUiState()
    data class Error(val message: String) : RoleEditUiState()
}

@HiltViewModel
class RolesViewModel @Inject constructor(
    private val repository: RolesRepository,
    private val uiMessageBus: UiMessageBus
) : ViewModel() {

    private val _uiState = MutableStateFlow<RolesUiState>(RolesUiState.Loading)
    val uiState: StateFlow<RolesUiState> = _uiState.asStateFlow()

    private val _editState = MutableStateFlow<RoleEditUiState>(RoleEditUiState.Idle)
    val editState: StateFlow<RoleEditUiState> = _editState.asStateFlow()

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

    fun loadRoleForEdit(roleId: String?) {
        viewModelScope.launch {
            _editState.value = RoleEditUiState.Loading
            try {
                val modules = repository.getPermissionModules()
                val role = if (roleId != null) repository.getRole(roleId) else null
                _editState.value = RoleEditUiState.Ready(role, modules)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _editState.value = RoleEditUiState.Error(msg)
            }
        }
    }

    fun saveRole(
        roleId: String?,
        name: String,
        description: String,
        permissions: List<String>,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _editState.value = RoleEditUiState.Saving
            try {
                if (roleId == null) {
                    repository.createRole(name, description, permissions)
                } else {
                    repository.updateRole(roleId, name, description, permissions)
                }
                _editState.value = RoleEditUiState.Saved
                loadRoles()
                onSuccess()
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _editState.value = RoleEditUiState.Error(msg)
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

    fun cloneRole(role: Role, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _editState.value = RoleEditUiState.Saving
            try {
                repository.createRole(
                    name = "${role.name} (Copy)",
                    description = role.description,
                    permissions = role.permissions
                )
                _editState.value = RoleEditUiState.Saved
                loadRoles()
                onSuccess()
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _editState.value = RoleEditUiState.Error(msg)
            }
        }
    }

    fun resetEditState() {
        _editState.value = RoleEditUiState.Idle
    }
}
