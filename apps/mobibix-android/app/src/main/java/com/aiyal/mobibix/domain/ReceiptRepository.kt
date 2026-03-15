package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.CreateReceiptRequest
import com.aiyal.mobibix.data.network.Receipt
import com.aiyal.mobibix.data.network.ReceiptStatus

interface ReceiptRepository {
    suspend fun getReceipts(startDate: String? = null, endDate: String? = null, skip: Int = 0, take: Int = 50): List<Receipt>
    suspend fun createReceipt(request: CreateReceiptRequest): Receipt
    suspend fun cancelReceipt(id: String, reason: String): Receipt
}
