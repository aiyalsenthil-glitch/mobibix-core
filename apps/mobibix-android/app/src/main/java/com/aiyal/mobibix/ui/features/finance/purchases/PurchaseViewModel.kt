package com.aiyal.mobibix.ui.features.finance.purchases

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.core.ui.UiMessageBus
import com.aiyal.mobibix.core.util.MobiError
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
    private val shopContextProvider: ShopContextProvider,
    private val uiMessageBus: UiMessageBus
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
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
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
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun submitPurchase(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                purchaseRepository.submitPurchase(id)
                loadPurchaseDetail(id)
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun recordPayment(id: String, amount: Double, method: String, reference: String?, notes: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                purchaseRepository.recordPayment(id, amount, method, reference, notes)
                loadPurchaseDetail(id)
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    // Quick pay from list screen — records payment then refreshes the list
    fun quickPayFromList(id: String, amount: Double, method: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                purchaseRepository.recordPayment(id, amount, method, null, null)
                loadPurchases()
                _uiState.value = _uiState.value.copy(actionSuccess = true)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun loadPurchaseOrders() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val list = purchaseRepository.listPurchaseOrders(shopId)
                _uiState.value = _uiState.value.copy(isLoading = false, purchaseOrders = list)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
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
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
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
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun createGrn(data: CreateGRNDto) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                purchaseRepository.createGrn(data)
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun confirmGrn(id: String, poId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                purchaseRepository.confirmGrn(id)
                loadPODetail(poId)
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun createPurchase(
        supplierName: String,
        invoiceNumber: String,
        paymentMethod: String,
        items: List<com.aiyal.mobibix.data.network.PurchaseItemDto>
    ) {
        val shopId = shopContextProvider.getActiveShopId() ?: run {
            uiMessageBus.showError("No active shop selected")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val dto = com.aiyal.mobibix.data.network.CreatePurchaseDto(
                    shopId = shopId,
                    globalSupplierId = null,
                    supplierName = supplierName,
                    supplierGstin = null,
                    invoiceNumber = invoiceNumber,
                    invoiceDate = null,
                    dueDate = null,
                    paymentMethod = paymentMethod,
                    status = null,
                    items = items,
                    currency = null,
                    exchangeRate = null,
                    poId = null,
                    grnId = null
                )
                purchaseRepository.createPurchase(dto)
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun resetActionSuccess() {
        _uiState.value = _uiState.value.copy(actionSuccess = false)
    }
}
