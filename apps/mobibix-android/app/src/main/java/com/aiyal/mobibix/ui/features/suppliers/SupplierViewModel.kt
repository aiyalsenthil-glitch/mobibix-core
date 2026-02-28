package com.aiyal.mobibix.ui.features.suppliers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.data.network.CreateSupplierDto
import com.aiyal.mobibix.data.network.Supplier
import com.aiyal.mobibix.domain.SupplierRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SupplierUiState(
    val suppliers: List<Supplier> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSaving: Boolean = false,
    val saveError: String? = null,
    val showAddEditSheet: Boolean = false,
    val editingSupplier: Supplier? = null
)

@HiltViewModel
class SupplierViewModel @Inject constructor(
    private val repository: SupplierRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SupplierUiState())
    val uiState: StateFlow<SupplierUiState> = _uiState.asStateFlow()

    init {
        loadSuppliers()
    }

    fun loadSuppliers() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val suppliers = repository.listSuppliers()
                _uiState.value = _uiState.value.copy(suppliers = suppliers, isLoading = false)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message ?: "Failed to load suppliers", isLoading = false)
            }
        }
    }

    fun openAddSheet() {
        _uiState.value = _uiState.value.copy(showAddEditSheet = true, editingSupplier = null)
    }

    fun openEditSheet(supplier: Supplier) {
        _uiState.value = _uiState.value.copy(showAddEditSheet = true, editingSupplier = supplier)
    }

    fun closeSheet() {
        _uiState.value = _uiState.value.copy(showAddEditSheet = false, editingSupplier = null, saveError = null)
    }

    fun saveSupplier(name: String, phone: String, email: String, address: String, gstNumber: String) {
        if (name.isBlank()) {
            _uiState.value = _uiState.value.copy(saveError = "Name is required")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, saveError = null)
            try {
                // Currently API only supports create based on provided interface
                // TODO: Add update endpoint support when available
                val dto = CreateSupplierDto(
                    name = name,
                    phone = phone.takeIf { it.isNotBlank() },
                    email = email.takeIf { it.isNotBlank() },
                    address = address.takeIf { it.isNotBlank() },
                    gstNumber = gstNumber.takeIf { it.isNotBlank() }
                )
                
                repository.createSupplier(dto)
                loadSuppliers() // Refresh list
                closeSheet()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(saveError = e.message ?: "Failed to save supplier", isSaving = false)
            }
        }
    }
}
