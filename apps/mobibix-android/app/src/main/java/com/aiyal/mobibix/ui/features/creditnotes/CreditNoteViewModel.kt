package com.aiyal.mobibix.ui.features.creditnotes

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.CreditNote
import com.aiyal.mobibix.data.network.CreditNoteApi
import com.aiyal.mobibix.data.network.CreateCreditNoteDto
import com.aiyal.mobibix.data.network.CustomerApi
import com.aiyal.mobibix.data.network.ShopApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CreditNoteCreateState(
    val loading: Boolean = false,
    val success: Boolean = false,
    val error: String? = null
)

data class CreditNoteListState(
    val loading: Boolean = true,
    val creditNotes: List<CreditNote> = emptyList(),
    val error: String? = null
)

data class CreditNoteDetailState(
    val loading: Boolean = true,
    val creditNote: CreditNote? = null,
    val error: String? = null,
    val actionLoading: Boolean = false,
    val actionError: String? = null,
    val actionSuccess: String? = null
)

@HiltViewModel
class CreditNoteViewModel @Inject constructor(
    private val creditNoteApi: CreditNoteApi,
    private val shopApi: ShopApi
) : ViewModel() {

    private val _listState = MutableStateFlow(CreditNoteListState())
    val listState = _listState.asStateFlow()

    private val _detailState = MutableStateFlow(CreditNoteDetailState())
    val detailState = _detailState.asStateFlow()

    private val _saving = MutableStateFlow(false)
    val saving = _saving.asStateFlow()

    private val _createState = MutableStateFlow(CreditNoteCreateState())
    val createState = _createState.asStateFlow()

    fun clearCreateState() { _createState.value = CreditNoteCreateState() }

    fun createSalesReturn(
        shopId: String,
        customerName: String,
        customerPhone: String?,
        originalInvoiceNo: String?,
        notes: String?,
        items: List<com.aiyal.mobibix.data.network.CreateCreditNoteItemDto>
    ) {
        viewModelScope.launch {
            _createState.value = CreditNoteCreateState(loading = true)
            try {
                val dto = CreateCreditNoteDto(
                    type = "CUSTOMER",
                    reason = "SALES_RETURN",
                    notes = buildString {
                        if (originalInvoiceNo != null) append("Ref: $originalInvoiceNo. ")
                        if (notes != null) append(notes)
                    }.takeIf { it.isNotBlank() },
                    items = items
                )
                creditNoteApi.createCreditNote(shopId, dto)
                _createState.value = CreditNoteCreateState(success = true)
            } catch (e: Exception) {
                _createState.value = CreditNoteCreateState(error = MobiError.extractMessage(e))
            }
        }
    }

    fun loadCreditNotes(shopId: String, typeFilter: String? = null) {
        viewModelScope.launch {
            _listState.value = CreditNoteListState(loading = true)
            try {
                val response = creditNoteApi.listCreditNotes(shopId, type = typeFilter)
                _listState.value = CreditNoteListState(loading = false, creditNotes = response.data)
            } catch (e: Exception) {
                _listState.value = CreditNoteListState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun loadCreditNote(shopId: String, id: String) {
        viewModelScope.launch {
            _detailState.value = CreditNoteDetailState(loading = true)
            try {
                val note = creditNoteApi.getCreditNote(shopId, id)
                _detailState.value = CreditNoteDetailState(loading = false, creditNote = note)
            } catch (e: Exception) {
                _detailState.value = CreditNoteDetailState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun createCreditNote(shopId: String, dto: CreateCreditNoteDto, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            _saving.value = true
            try {
                creditNoteApi.createCreditNote(shopId, dto)
                onSuccess()
            } catch (e: Exception) {
                onError(MobiError.extractMessage(e))
            } finally {
                _saving.value = false
            }
        }
    }

    fun issueCreditNote(shopId: String, id: String) {
        viewModelScope.launch {
            _detailState.value = _detailState.value.copy(actionLoading = true, actionError = null)
            try {
                val updated = creditNoteApi.issueCreditNote(shopId, id)
                _detailState.value = _detailState.value.copy(
                    creditNote = updated, actionLoading = false, actionSuccess = "Credit note issued"
                )
            } catch (e: Exception) {
                _detailState.value = _detailState.value.copy(
                    actionLoading = false, actionError = MobiError.extractMessage(e)
                )
            }
        }
    }

    fun voidCreditNote(shopId: String, id: String, reason: String) {
        viewModelScope.launch {
            _detailState.value = _detailState.value.copy(actionLoading = true, actionError = null)
            try {
                val updated = creditNoteApi.voidCreditNote(
                    shopId, id,
                    com.aiyal.mobibix.data.network.VoidCreditNoteDto(reason)
                )
                _detailState.value = _detailState.value.copy(
                    creditNote = updated, actionLoading = false, actionSuccess = "Credit note voided"
                )
            } catch (e: Exception) {
                _detailState.value = _detailState.value.copy(
                    actionLoading = false, actionError = MobiError.extractMessage(e)
                )
            }
        }
    }

    fun clearActionState() {
        _detailState.value = _detailState.value.copy(actionError = null, actionSuccess = null)
    }
}
