package com.aiyal.mobibix.ui.features.sales

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.data.network.CreateInvoiceRequest
import com.aiyal.mobibix.data.network.InvoiceDetails
import com.aiyal.mobibix.data.network.InvoiceListItem
import com.aiyal.mobibix.data.network.ProductApi
import com.aiyal.mobibix.data.network.SalesApi
import com.aiyal.mobibix.data.network.ShopApi
import com.aiyal.mobibix.data.network.ShopProduct
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SalesListState(
    val loading: Boolean = true,
    val invoices: List<InvoiceListItem> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class SalesViewModel @Inject constructor(
    private val salesApi: SalesApi,
    private val productApi: ProductApi,
    private val shopApi: ShopApi
) : ViewModel() {

    // State for the invoice list screen
    private val _state = MutableStateFlow(SalesListState())
    val state = _state.asStateFlow()

    // State for the invoice details screen
    private val _invoiceDetails = MutableStateFlow<InvoiceDetails?>(null)
    val invoiceDetails = _invoiceDetails.asStateFlow()
    
    // State for the products dropdown in the form
    private val _products = MutableStateFlow<List<ShopProduct>>(emptyList())
    val products = _products.asStateFlow()

    // State for the GST setting in the form
    private val _gstEnabled = MutableStateFlow(false)
    val gstEnabled = _gstEnabled.asStateFlow()
    
    // State for the saving process
    var saving = MutableStateFlow(false)
        private set

    fun loadInvoices(shopId: String) {
        viewModelScope.launch {
            _state.value = SalesListState(loading = true)
            try {
                val response = salesApi.listInvoices(shopId)
                _state.value = SalesListState(loading = false, invoices = response.data)
            } catch (e: Exception) {
                _state.value = SalesListState(loading = false, error = e.message)
            }
        }
    }

    fun loadInvoiceDetails(invoiceId: String) {
        viewModelScope.launch {
            _invoiceDetails.value = null // Reset on new load
            try {
                _invoiceDetails.value = salesApi.getInvoiceDetails(invoiceId)
            } catch (e: Exception) {
                // Handle error
            }
        }
    }

    fun cancelInvoice(invoiceId: String) {
        viewModelScope.launch {
            try {
                salesApi.cancelInvoice(invoiceId)
                // Refresh details to show "CANCELLED" status
                loadInvoiceDetails(invoiceId)
            } catch (e: Exception) {
                // Handle error
            }
        }
    }

    fun loadInitialData(shopId: String) {
        viewModelScope.launch {
            try {
                // Fetch all products for the dropdown (using a large limit for now)
                val response = productApi.getProductsForShop(shopId, take = 1000)
                _products.value = response.data
                _gstEnabled.value = shopApi.getShopSettings(shopId).gstEnabled
            } catch (e: Exception) {
                // Handle error
            }
        }
    }

    fun createInvoice(
        request: CreateInvoiceRequest,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            try {
                saving.value = true
                salesApi.createInvoice(request)
                onSuccess()
            } catch (e: Exception) {
                onError(e.message ?: "Failed to create invoice")
            } finally {
                saving.value = false
            }
        }
    }
}
