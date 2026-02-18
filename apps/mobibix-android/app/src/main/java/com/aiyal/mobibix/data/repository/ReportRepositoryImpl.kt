package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.InventoryReportItem
import com.aiyal.mobibix.data.network.ProfitSummaryResponse
import com.aiyal.mobibix.data.network.ReportApi
import com.aiyal.mobibix.data.network.SalesReportItem
import com.aiyal.mobibix.domain.ReportRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ReportRepositoryImpl @Inject constructor(
    private val reportApi: ReportApi
) : ReportRepository {
    override suspend fun getSalesReport(shopId: String?, startDate: String?, endDate: String?): List<SalesReportItem> {
        return reportApi.getSalesReport(shopId, startDate, endDate)
    }

    override suspend fun getRepairReport(shopId: String?, startDate: String?, endDate: String?): List<SalesReportItem> {
        return reportApi.getRepairReport(shopId, startDate, endDate)
    }

    override suspend fun getInventoryReport(shopId: String?): List<InventoryReportItem> {
        return reportApi.getInventoryReport(shopId)
    }

    override suspend fun getProfitSummary(shopId: String?, startDate: String?, endDate: String?): ProfitSummaryResponse {
        return reportApi.getProfitSummary(shopId, startDate, endDate)
    }

    override suspend fun getTaxReport(shopId: String?, startDate: String?, endDate: String?): List<com.aiyal.mobibix.data.network.TaxReportItem> {
        return reportApi.getTaxReport(shopId, startDate, endDate)
    }

    override suspend fun getReceivables(shopId: String?): List<com.aiyal.mobibix.data.network.OutstandingItem> {
        return reportApi.getReceivables(shopId)
    }

    override suspend fun getPayables(shopId: String?): List<com.aiyal.mobibix.data.network.OutstandingItem> {
        return reportApi.getPayables(shopId)
    }

    override suspend fun getDailySales(shopId: String?, startDate: String?, endDate: String?): List<com.aiyal.mobibix.data.network.DailySalesItem> {
        return reportApi.getDailySales(shopId, startDate, endDate)
    }
}
