package com.aiyal.mobibix.ui.features.finance.purchases

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.CreatePurchaseDto
import com.aiyal.mobibix.data.network.Purchase
import com.aiyal.mobibix.data.network.PurchaseStatus
import com.aiyal.mobibix.data.network.PurchaseOrder
import com.aiyal.mobibix.data.network.PurchaseOrderStatus
import com.aiyal.mobibix.data.network.GRN
import com.aiyal.mobibix.data.network.CreateGRNDto
import com.aiyal.mobibix.domain.PurchaseRepository
import com.aiyal.mobibix.domain.SupplierRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PurchaseUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val purchases: List<Purchase> = emptyList(),
    val selectedPurchase: Purchase? = null,
    val purchaseOrders: List<PurchaseOrder> = emptyList(),
    val selectedPO: PurchaseOrder? = null,
    val grns: List<GRN> = emptyList(),
    val selectedGRN: GRN? = null,
    val actionSuccess: Boolean = false
)

@HiltViewModel
class PurchaseViewModel @Inject constructor(
    private val purchaseRepository: PurchaseRepository,
    private val supplierRepository: SupplierRepository,
    private val shopContextProvider: ShopContextProvider
) : ViewModel() {

    private val _uiState = MutableStateFlow(PurchaseUiState())
    val uiState: StateFlow<PurchaseUiState> = _uiState.asStateFlow()

    fun loadPurchases() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val list = purchaseRepository.listPurchases(shopId)
                _uiState.value = _uiState.value.copy(isLoading = false, purchases = list)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun loadPurchaseDetail(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val purchase = purchaseRepository.getPurchase(id)
                _uiState.value = _uiState.value.copy(isLoading = false, selectedPurchase = purchase)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun submitPurchase(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                purchaseRepository.submitPurchase(id)
                loadPurchaseDetail(id) // Refresh
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun recordPayment(id: String, amount: Double, method: String, reference: String?, notes: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                purchaseRepository.recordPayment(id, amount, method, reference, notes)
                loadPurchaseDetail(id) // Refresh
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    // Purchase Orders
    fun loadPurchaseOrders() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val list = purchaseRepository.listPurchaseOrders(shopId)
                _uiState.value = _uiState.value.copy(isLoading = false, purchaseOrders = list)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun loadPODetail(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val po = purchaseRepository.getPurchaseOrder(id)
                _uiState.value = _uiState.value.copy(isLoading = false, selectedPO = po)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun transitionPOStatus(id: String, status: PurchaseOrderStatus) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                purchaseRepository.transitionPOStatus(id, status)
                loadPODetail(id)
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    // GRNs
    fun createGrn(data: CreateGRNDto) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                purchaseRepository.createGrn(data)
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun confirmGrn(id: String, poId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                purchaseRepository.confirmGrn(id)
                loadPODetail(poId) // Refresh PO to see updated received quantities
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }
    
    fun resetActionSuccess() {
        _uiState.value = _uiState.value.copy(actionSuccess = false)
    }
}
