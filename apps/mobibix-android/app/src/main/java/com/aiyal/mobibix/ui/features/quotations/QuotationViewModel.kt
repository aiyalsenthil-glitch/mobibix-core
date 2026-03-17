package com.aiyal.mobibix.ui.features.quotations

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.CreateQuotationDto
import com.aiyal.mobibix.data.network.ConvertQuotationDto
import com.aiyal.mobibix.data.network.Quotation
import com.aiyal.mobibix.data.network.QuotationApi
import com.aiyal.mobibix.data.network.UpdateQuotationStatusDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class QuotationListState(
    val loading: Boolean = true,
    val quotations: List<Quotation> = emptyList(),
    val error: String? = null
)

data class QuotationDetailState(
    val loading: Boolean = true,
    val quotation: Quotation? = null,
    val error: String? = null,
    val converting: Boolean = false,
    val convertedInvoiceId: String? = null,
    val convertedJobCardId: String? = null
)

@HiltViewModel
class QuotationViewModel @Inject constructor(
    private val quotationApi: QuotationApi
) : ViewModel() {

    private val _listState = MutableStateFlow(QuotationListState())
    val listState = _listState.asStateFlow()

    private val _detailState = MutableStateFlow(QuotationDetailState())
    val detailState = _detailState.asStateFlow()

    private val _saving = MutableStateFlow(false)
    val saving = _saving.asStateFlow()

    fun loadQuotations(shopId: String, statusFilter: String? = null) {
        viewModelScope.launch {
            _listState.value = QuotationListState(loading = true)
            try {
                val response = quotationApi.listQuotations(shopId, status = statusFilter)
                _listState.value = QuotationListState(loading = false, quotations = response.data)
            } catch (e: Exception) {
                _listState.value = QuotationListState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun loadQuotation(shopId: String, id: String) {
        viewModelScope.launch {
            _detailState.value = QuotationDetailState(loading = true)
            try {
                val q = quotationApi.getQuotation(shopId, id)
                _detailState.value = QuotationDetailState(loading = false, quotation = q)
            } catch (e: Exception) {
                _detailState.value = QuotationDetailState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun createQuotation(shopId: String, dto: CreateQuotationDto, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            _saving.value = true
            try {
                quotationApi.createQuotation(shopId, dto)
                onSuccess()
            } catch (e: Exception) {
                onError(MobiError.extractMessage(e))
            } finally {
                _saving.value = false
            }
        }
    }

    fun updateStatus(shopId: String, id: String, status: String) {
        viewModelScope.launch {
            try {
                val updated = quotationApi.updateQuotationStatus(shopId, id, UpdateQuotationStatusDto(status))
                _detailState.value = _detailState.value.copy(quotation = updated)
            } catch (e: Exception) {
                _detailState.value = _detailState.value.copy(error = MobiError.extractMessage(e))
            }
        }
    }

    fun convertToInvoice(shopId: String, id: String) {
        viewModelScope.launch {
            _detailState.value = _detailState.value.copy(converting = true)
            try {
                val result = quotationApi.convertQuotation(shopId, id, ConvertQuotationDto(conversionType = "INVOICE"))
                _detailState.value = _detailState.value.copy(converting = false, convertedInvoiceId = result.invoiceId)
            } catch (e: Exception) {
                _detailState.value = _detailState.value.copy(converting = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun delete(shopId: String, id: String, onDone: () -> Unit) {
        viewModelScope.launch {
            try {
                quotationApi.deleteQuotation(shopId, id)
                onDone()
            } catch (_: Exception) { onDone() }
        }
    }
}
