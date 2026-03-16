package com.aiyal.mobibix.ui.features.home

import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.ui.UiMessageBus
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.domain.DashboardRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val repository: DashboardRepository,
    private val shopRepository: com.aiyal.mobibix.domain.ShopRepository,
    private val uiMessageBus: UiMessageBus
) : ViewModel() {

    var ownerState = mutableStateOf(OwnerDashboardState())
        private set

    var staffState = mutableStateOf(StaffDashboardState())
        private set

    fun loadOwnerDashboard(shopId: String?) {
        viewModelScope.launch {
            ownerState.value = ownerState.value.copy(loading = true, selectedShopId = shopId)
            try {
                val res = repository.getOwnerDashboard(shopId)
                ownerState.value = ownerState.value.copy(
                    loading = false,
                    todaySales = res.today.salesAmount,
                    jobsReceived = res.today.jobsReceived,
                    monthSales = res.month.salesAmount,
                    invoiceCount = res.month.invoiceCount,
                    totalProducts = res.inventory.totalProducts,
                    negativeStock = res.inventory.negativeStockCount,
                    deadStock = res.inventory.deadStockCount,
                    inProgress = res.repairs.inProgress,
                    waitingParts = res.repairs.waitingForParts,
                    ready = res.repairs.ready,
                    deliveredToday = res.repairs.deliveredToday,
                    percentageChange = calculateTrend(res.salesTrend),
                    paymentStats = res.paymentStats.map { DashboardChartItem(it.name, it.value) },
                    salesTrend = res.salesTrend.map { DashboardTrendItem(it.date, it.sales) }
                )
            } catch (e: Exception) {
                uiMessageBus.showError(MobiError.extractMessage(e))
                ownerState.value = ownerState.value.copy(loading = false)
            }
        }
    }

    private fun calculateTrend(trend: List<com.aiyal.mobibix.data.network.SalesTrend>): Double {
        if (trend.size < 2) return 0.0
        val today = trend.last().sales
        val yesterday = trend[trend.size - 2].sales
        if (yesterday == 0.0) return if (today > 0) 100.0 else 0.0
        return ((today - yesterday) / yesterday) * 100
    }

    fun loadShops() {
        viewModelScope.launch {
            try {
                val shops = shopRepository.getMyShops()
                ownerState.value = ownerState.value.copy(shops = shops)
            } catch (_: Exception) {
                // shops load failure is non-critical
            }
        }
    }

    fun loadStaffDashboard() {
        viewModelScope.launch {
            staffState.value = staffState.value.copy(loading = true)
            try {
                val res = repository.getStaffDashboard()
                staffState.value = StaffDashboardState(
                    loading = false,
                    inProgress = res.jobs.inProgress,
                    waitingParts = res.jobs.waitingForParts,
                    ready = res.jobs.ready,
                    deliveredToday = res.jobs.deliveredToday,
                    negativeStock = res.stockAlerts.negativeStockCount,
                    zeroStock = res.stockAlerts.zeroStockCount
                )
            } catch (e: Exception) {
                uiMessageBus.showError(MobiError.extractMessage(e))
                staffState.value = staffState.value.copy(loading = false)
            }
        }
    }
}
