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
import com.aiyal.mobibix.domain.ShopRepository
import com.aiyal.mobibix.domain.model.Role
import com.aiyal.mobibix.domain.repository.RolesRepository
import com.aiyal.mobibix.data.network.ShopResponse
import kotlinx.coroutines.async

data class StaffUiState(
    val isLoading: Boolean = false,
    val staff: List<StaffResponse> = emptyList(),
    val invites: List<InviteResponse> = emptyList(),
    val roles: List<Role> = emptyList(),
    val shops: List<ShopResponse> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class StaffViewModel @Inject constructor(
    private val staffRepository: StaffRepository,
    private val rolesRepository: RolesRepository,
    private val shopRepository: ShopRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(StaffUiState())
    val uiState: StateFlow<StaffUiState> = _uiState.asStateFlow()

    init {
        loadInitialData()
    }

    fun loadInitialData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val staffDeferred = async { staffRepository.getStaff() }
                val invitesDeferred = async { staffRepository.getInvites() }
                val rolesDeferred = async { rolesRepository.listRoles() }
                val shopsDeferred = async { shopRepository.getShops() }

                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    staff = staffDeferred.await(),
                    invites = invitesDeferred.await(),
                    roles = rolesDeferred.await(),
                    shops = shopsDeferred.await()
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load staff data"
                )
            }
        }
    }

    fun removeStaff(id: String) {
        viewModelScope.launch {
            try {
                staffRepository.removeStaff(id)
                loadInitialData()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }

    fun revokeInvite(id: String) {
        viewModelScope.launch {
            try {
                staffRepository.revokeInvite(id)
                loadInitialData()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }
        }
    }
}
