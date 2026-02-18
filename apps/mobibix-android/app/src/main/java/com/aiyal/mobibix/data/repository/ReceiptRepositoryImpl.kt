package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.CreateReceiptRequest
import com.aiyal.mobibix.data.network.Receipt
import com.aiyal.mobibix.data.network.ReceiptApi
import com.aiyal.mobibix.domain.ReceiptRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ReceiptRepositoryImpl @Inject constructor(
    private val receiptApi: ReceiptApi
) : ReceiptRepository {
    override suspend fun getReceipts(startDate: String?, endDate: String?, skip: Int, take: Int): List<Receipt> {
        return receiptApi.getReceipts(startDate, endDate, null, null, skip, take).data
    }

    override suspend fun createReceipt(request: CreateReceiptRequest): Receipt {
        return receiptApi.createReceipt(request)
    }

    override suspend fun cancelReceipt(id: String, reason: String): Receipt {
        return receiptApi.cancelReceipt(id, mapOf("reason" to reason))
    }
}
