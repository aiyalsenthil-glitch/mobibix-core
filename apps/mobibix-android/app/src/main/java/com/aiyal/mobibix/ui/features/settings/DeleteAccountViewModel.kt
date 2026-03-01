package com.aiyal.mobibix.ui.features.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.data.network.RequestDeletionRequest
import com.aiyal.mobibix.data.network.TenantApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class DeleteAccountState {
    object Idle : DeleteAccountState()
    object Loading : DeleteAccountState()
    object Success : DeleteAccountState()
    data class Error(val message: String) : DeleteAccountState()
}

@HiltViewModel
class DeleteAccountViewModel @Inject constructor(
    private val tenantApi: TenantApi
) : ViewModel() {

    private val _state = MutableStateFlow<DeleteAccountState>(DeleteAccountState.Idle)
    val state: StateFlow<DeleteAccountState> = _state

    fun requestDeletion(reason: String?) {
        viewModelScope.launch {
            _state.value = DeleteAccountState.Loading
            try {
                tenantApi.requestDeletion(
                    RequestDeletionRequest(
                        acknowledged = true,
                        reason = reason
                    )
                )
                _state.value = DeleteAccountState.Success
            } catch (e: Exception) {
                _state.value = DeleteAccountState.Error(e.message ?: "Failed to submit request")
            }
        }
    }
}
