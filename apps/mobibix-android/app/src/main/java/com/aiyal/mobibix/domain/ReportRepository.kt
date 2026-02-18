package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.InventoryReportItem
import com.aiyal.mobibix.data.network.ProfitSummaryResponse
import com.aiyal.mobibix.data.network.SalesReportItem

interface ReportRepository {
    suspend fun getSalesReport(shopId: String?, startDate: String?, endDate: String?): List<SalesReportItem>
    suspend fun getRepairReport(shopId: String?, startDate: String?, endDate: String?): List<SalesReportItem>
    suspend fun getInventoryReport(shopId: String?): List<InventoryReportItem>
    suspend fun getProfitSummary(shopId: String?, startDate: String?, endDate: String?): ProfitSummaryResponse
}
