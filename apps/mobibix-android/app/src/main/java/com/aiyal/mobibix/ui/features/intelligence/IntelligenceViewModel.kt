package com.aiyal.mobibix.ui.features.intelligence

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// ─── Inventory Intelligence State ─────────────────────────────────────────────

data class InventoryIntelligenceState(
    val loading: Boolean = true,
    val intelligence: InventoryIntelligence? = null,
    val error: String? = null
)

// ─── Compatibility State ──────────────────────────────────────────────────────

data class CompatibilityState(
    val loading: Boolean = false,
    val query: String = "",
    val suggestions: List<PhoneModelSuggestion> = emptyList(),
    val result: CompatibilityResponse? = null,
    val error: String? = null
)

// ─── Shrinkage State ──────────────────────────────────────────────────────────

data class ShrinkageState(
    val loading: Boolean = true,
    val intelligence: ShrinkageIntelligence? = null,
    val error: String? = null
)

// ─── Expense Intelligence State ───────────────────────────────────────────────

data class ExpenseIntelligenceState(
    val loading: Boolean = true,
    val intelligence: ExpenseIntelligence? = null,
    val error: String? = null
)

@HiltViewModel
class IntelligenceViewModel @Inject constructor(
    private val intelligenceApi: IntelligenceApi,
    private val operationsApi: OperationsApi
) : ViewModel() {

    private val _inventoryState = MutableStateFlow(InventoryIntelligenceState())
    val inventoryState = _inventoryState.asStateFlow()

    private val _compatibilityState = MutableStateFlow(CompatibilityState())
    val compatibilityState = _compatibilityState.asStateFlow()

    private val _shrinkageState = MutableStateFlow(ShrinkageState())
    val shrinkageState = _shrinkageState.asStateFlow()

    private val _expenseState = MutableStateFlow(ExpenseIntelligenceState())
    val expenseState = _expenseState.asStateFlow()

    fun loadInventoryIntelligence(shopId: String, startDate: String? = null, endDate: String? = null) {
        viewModelScope.launch {
            _inventoryState.value = InventoryIntelligenceState(loading = true)
            try {
                val data = intelligenceApi.getInventoryIntelligence(shopId, startDate, endDate)
                _inventoryState.value = InventoryIntelligenceState(loading = false, intelligence = data)
            } catch (e: Exception) {
                _inventoryState.value = InventoryIntelligenceState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun searchCompatibility(model: String) {
        viewModelScope.launch {
            _compatibilityState.value = _compatibilityState.value.copy(loading = true, error = null, result = null)
            try {
                val result = intelligenceApi.searchCompatibility(model)
                _compatibilityState.value = _compatibilityState.value.copy(loading = false, result = result, query = model)
            } catch (e: Exception) {
                _compatibilityState.value = _compatibilityState.value.copy(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun autocompleteModels(query: String) {
        viewModelScope.launch {
            try {
                val suggestions = intelligenceApi.autocompletePhoneModels(query)
                _compatibilityState.value = _compatibilityState.value.copy(suggestions = suggestions)
            } catch (e: Exception) {
                Log.w("IntelligenceVM", "Autocomplete failed: ${e.message}")
            }
        }
    }

    fun loadShrinkage(shopId: String, startDate: String? = null, endDate: String? = null) {
        viewModelScope.launch {
            _shrinkageState.value = ShrinkageState(loading = true)
            try {
                val data = operationsApi.getShrinkageIntelligence(shopId, startDate, endDate)
                _shrinkageState.value = ShrinkageState(loading = false, intelligence = data)
            } catch (e: Exception) {
                _shrinkageState.value = ShrinkageState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun loadExpenseIntelligence(shopId: String, startDate: String? = null, endDate: String? = null) {
        viewModelScope.launch {
            _expenseState.value = ExpenseIntelligenceState(loading = true)
            try {
                val data = operationsApi.getExpenseIntelligence(shopId, startDate, endDate)
                _expenseState.value = ExpenseIntelligenceState(loading = false, intelligence = data)
            } catch (e: Exception) {
                _expenseState.value = ExpenseIntelligenceState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }
}
