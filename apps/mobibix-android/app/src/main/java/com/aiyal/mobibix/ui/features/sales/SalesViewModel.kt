package com.aiyal.mobibix.ui.features.sales

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.CollectInvoicePaymentRequest
import com.aiyal.mobibix.data.network.CreateInvoiceRequest
import com.aiyal.mobibix.data.network.InvoiceDetails
import com.aiyal.mobibix.data.network.InvoiceListItem
import com.aiyal.mobibix.data.network.PaymentMethodRequest
import com.aiyal.mobibix.data.network.ProductApi
import com.aiyal.mobibix.data.network.SalesApi
import com.aiyal.mobibix.data.network.SendMessageRequest
import com.aiyal.mobibix.data.network.ShopApi
import com.aiyal.mobibix.data.network.ShopDetails
import com.aiyal.mobibix.data.network.ShopProduct
import com.aiyal.mobibix.data.network.WhatsappApi
import com.aiyal.mobibix.core.util.MobiError
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SalesListState(
    val loading: Boolean = true,
    val invoices: List<InvoiceListItem> = emptyList(),
    val error: String? = null
)

/**
 * Combined state for invoice detail + shop — both needed to render the print template.
 * A7 FIX: InvoicePrintData requires shopName, shopAddress, shopGstin which are NOT
 * in InvoiceDetails. We must load shop alongside invoice for print to work.
 */
data class InvoiceDetailWithShop(
    val invoice: InvoiceDetails,
    val shop: ShopDetails? = null  // null if shop load failed; print degrades gracefully
)

@HiltViewModel
class SalesViewModel @Inject constructor(
    private val salesApi: SalesApi,
    private val productApi: ProductApi,
    private val shopApi: ShopApi,
    private val whatsappApi: WhatsappApi,
    private val shopContextProvider: ShopContextProvider
) : ViewModel() {

    // State for the invoice list screen
    private val _state = MutableStateFlow(SalesListState())
    val state = _state.asStateFlow()

    // A7 FIX: now includes shop details for print rendering
    private val _invoiceWithShop = MutableStateFlow<InvoiceDetailWithShop?>(null)
    val invoiceWithShop = _invoiceWithShop.asStateFlow()

    // Backward-compat convenience accessor — screens that don't need shop
    val invoiceDetails = MutableStateFlow<InvoiceDetails?>(null).also { flow ->
        viewModelScope.launch {
            _invoiceWithShop.collect { flow.value = it?.invoice }
        }
    }.asStateFlow()

    // State for the products dropdown in the form
    private val _products = MutableStateFlow<List<ShopProduct>>(emptyList())
    val products = _products.asStateFlow()

    // State for the GST setting in the form
    private val _gstEnabled = MutableStateFlow(false)
    val gstEnabled = _gstEnabled.asStateFlow()

    // State for the saving process
    var saving = MutableStateFlow(false)
        private set

    // B5 FIX: cancel error is surfaced to UI instead of silenced
    private val _cancelError = MutableStateFlow<String?>(null)
    val cancelError = _cancelError.asStateFlow()

    private val _actionLoading = MutableStateFlow(false)
    val actionLoading = _actionLoading.asStateFlow()

    private val _actionError = MutableStateFlow<String?>(null)
    val actionError = _actionError.asStateFlow()

    fun loadInvoices(shopId: String) {
        viewModelScope.launch {
            _state.value = SalesListState(loading = true)
            try {
                val response = salesApi.listInvoices(shopId)
                _state.value = SalesListState(loading = false, invoices = response.data)
            } catch (e: Exception) {
                _state.value = SalesListState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    /**
     * A7 FIX: loads invoice AND shop concurrently so the print template has all required data.
     * shopId is needed to fetch shop details for the invoice print header.
     */
    fun loadInvoiceDetails(invoiceId: String, shopId: String? = null) {
        viewModelScope.launch {
            _invoiceWithShop.value = null // Reset on new load
            try {
                if (shopId != null) {
                    // Parallel fetch: invoice + shop details for print
                    val invoiceDeferred = async { salesApi.getInvoiceDetails(invoiceId) }
                    val shopDeferred = async {
                        try { shopApi.getShopSettings(shopId) } catch (e: Exception) { null }
                    }
                    _invoiceWithShop.value = InvoiceDetailWithShop(
                        invoice = invoiceDeferred.await(),
                        shop = shopDeferred.await()
                    )
                } else {
                    // Fallback: invoice only (print will degrade — no shop header)
                    _invoiceWithShop.value = InvoiceDetailWithShop(
                        invoice = salesApi.getInvoiceDetails(invoiceId)
                    )
                }
            } catch (e: Exception) {
                // Invoice load failed — keep null state so UI shows spinner/error
            }
        }
    }

    /**
     * B5 FIX: cancel error is now surfaced via [cancelError] state instead of silently dropped.
     * Backend can reject cancellation (e.g. IMEI already sold, active payments).
     */
    fun cancelInvoice(invoiceId: String) {
        viewModelScope.launch {
            _cancelError.value = null
            try {
                salesApi.cancelInvoice(invoiceId)
                // Refresh details to show "CANCELLED" status
                val current = _invoiceWithShop.value
                loadInvoiceDetails(invoiceId)
            } catch (e: Exception) {
                _cancelError.value = MobiError.extractMessage(e)
            }
        }
    }

    fun clearCancelError() {
        _cancelError.value = null
    }

    fun collectPayment(invoiceId: String, amount: Double, method: String, ref: String?, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _actionLoading.value = true
            _actionError.value = null
            try {
                val request = CollectInvoicePaymentRequest(
                    paymentMethods = listOf(PaymentMethodRequest(mode = method, amount = amount)),
                    transactionRef = ref
                )
                val updated = salesApi.collectPayment(invoiceId, request)
                val current = _invoiceWithShop.value
                _invoiceWithShop.value = current?.copy(invoice = updated)
                onSuccess()
            } catch (e: Exception) {
                _actionError.value = MobiError.extractMessage(e)
            } finally {
                _actionLoading.value = false
            }
        }
    }

    fun sendInvoiceWhatsApp(invoice: InvoiceDetails, shopId: String, shopName: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        val phone = invoice.customerPhone ?: run { onError("No phone number on invoice"); return }
        viewModelScope.launch {
            _actionLoading.value = true
            try {
                whatsappApi.sendMessage(
                    SendMessageRequest(
                        shopId = shopId,
                        phoneNumber = phone,
                        templateName = "invoice_created_confirmation_v1",
                        language = "en",
                        parameters = listOf(
                            invoice.customerName ?: "Customer",
                            shopName,
                            invoice.invoiceNumber,
                            "₹${"%.2f".format(invoice.totalAmount)}"
                        )
                    )
                )
                loadInvoiceDetails(invoice.id, shopId) // refresh to update whatsappSent
                onSuccess()
            } catch (e: Exception) {
                onError(MobiError.extractMessage(e))
            } finally {
                _actionLoading.value = false
            }
        }
    }

    fun clearActionError() {
        _actionError.value = null
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
                onError(MobiError.extractMessage(e))
            } finally {
                saving.value = false
            }
        }
    }
}
