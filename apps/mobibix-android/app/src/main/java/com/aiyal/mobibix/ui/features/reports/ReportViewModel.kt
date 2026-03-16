package com.aiyal.mobibix.ui.features.reports

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.core.ui.UiMessageBus
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.InventoryReportItem
import com.aiyal.mobibix.data.network.ProfitSummaryMetrics
import com.aiyal.mobibix.data.network.SalesReportItem
import com.aiyal.mobibix.domain.ReportRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

data class ReportsUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val salesReport: List<SalesReportItem> = emptyList(),
    val repairReport: List<SalesReportItem> = emptyList(),
    val inventoryReport: List<InventoryReportItem> = emptyList(),
    val profitMetrics: ProfitSummaryMetrics? = null,
    val taxReport: List<com.aiyal.mobibix.data.network.TaxReportItem> = emptyList(),
    val gstr2Report: List<com.aiyal.mobibix.data.network.Gstr2ReportItem> = emptyList(),
    val receivables: List<com.aiyal.mobibix.data.network.OutstandingItem> = emptyList(),
    val payables: List<com.aiyal.mobibix.data.network.OutstandingItem> = emptyList(),
    val dailySales: List<com.aiyal.mobibix.data.network.DailySalesItem> = emptyList(),
    val startDate: String = LocalDate.now().minusMonths(1).format(DateTimeFormatter.ISO_DATE),
    val endDate: String = LocalDate.now().format(DateTimeFormatter.ISO_DATE)
)

@HiltViewModel
class ReportViewModel @Inject constructor(
    private val reportRepository: ReportRepository,
    private val shopContextProvider: ShopContextProvider,
    private val uiMessageBus: UiMessageBus
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReportsUiState())
    val uiState: StateFlow<ReportsUiState> = _uiState.asStateFlow()

    fun updateDateRange(startDate: String, endDate: String) {
        _uiState.value = _uiState.value.copy(startDate = startDate, endDate = endDate)
    }

    fun loadSalesReport() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val report = reportRepository.getSalesReport(shopId, _uiState.value.startDate, _uiState.value.endDate)
                _uiState.value = _uiState.value.copy(isLoading = false, salesReport = report)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun loadRepairReport() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val report = reportRepository.getRepairReport(shopId, _uiState.value.startDate, _uiState.value.endDate)
                _uiState.value = _uiState.value.copy(isLoading = false, repairReport = report)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun loadInventoryReport() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val report = reportRepository.getInventoryReport(shopId)
                _uiState.value = _uiState.value.copy(isLoading = false, inventoryReport = report)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun loadProfitSummary() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val response = reportRepository.getProfitSummary(shopId, _uiState.value.startDate, _uiState.value.endDate)
                _uiState.value = _uiState.value.copy(isLoading = false, profitMetrics = response.metrics)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun loadTaxReport() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val report = reportRepository.getTaxReport(shopId, _uiState.value.startDate, _uiState.value.endDate)
                _uiState.value = _uiState.value.copy(isLoading = false, taxReport = report)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun loadGstr2Report() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val report = reportRepository.getGstr2Report(shopId, _uiState.value.startDate, _uiState.value.endDate)
                _uiState.value = _uiState.value.copy(isLoading = false, gstr2Report = report)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun loadReceivables() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val report = reportRepository.getReceivables(shopId)
                _uiState.value = _uiState.value.copy(isLoading = false, receivables = report)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun loadPayables() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val report = reportRepository.getPayables(shopId)
                _uiState.value = _uiState.value.copy(isLoading = false, payables = report)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }

    fun loadDailySales() {
        val shopId = shopContextProvider.getActiveShopId() ?: ""
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val report = reportRepository.getDailySales(shopId, _uiState.value.startDate, _uiState.value.endDate)
                _uiState.value = _uiState.value.copy(isLoading = false, dailySales = report)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _uiState.value = _uiState.value.copy(isLoading = false, error = msg)
            }
        }
    }
}
