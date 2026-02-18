package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.InventoryReportItem
import com.aiyal.mobibix.data.network.ProfitSummaryResponse
import com.aiyal.mobibix.data.network.SalesReportItem

interface ReportRepository {
    suspend fun getSalesReport(shopId: String?, startDate: String?, endDate: String?): List<SalesReportItem>
    suspend fun getRepairReport(shopId: String?, startDate: String?, endDate: String?): List<SalesReportItem>
    suspend fun getInventoryReport(shopId: String?): List<InventoryReportItem>
    suspend fun getProfitSummary(shopId: String?, startDate: String?, endDate: String?): ProfitSummaryResponse
    suspend fun getTaxReport(shopId: String?, startDate: String?, endDate: String?): List<com.aiyal.mobibix.data.network.TaxReportItem>
    suspend fun getReceivables(shopId: String?): List<com.aiyal.mobibix.data.network.OutstandingItem>
    suspend fun getPayables(shopId: String?): List<com.aiyal.mobibix.data.network.OutstandingItem>
    suspend fun getDailySales(shopId: String?, startDate: String?, endDate: String?): List<com.aiyal.mobibix.data.network.DailySalesItem>
}
