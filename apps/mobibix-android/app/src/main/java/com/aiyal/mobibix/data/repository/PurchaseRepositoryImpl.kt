package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.*
import com.aiyal.mobibix.domain.PurchaseRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PurchaseRepositoryImpl @Inject constructor(
    private val purchaseApi: PurchaseApi
) : PurchaseRepository {
    override suspend fun listPurchases(shopId: String, status: PurchaseStatus?, skip: Int, take: Int): List<Purchase> {
        return purchaseApi.listPurchases(shopId, status, null, skip, take).data
    }

    override suspend fun getPurchase(id: String): Purchase {
        return purchaseApi.getPurchase(id)
    }

    override suspend fun createPurchase(data: CreatePurchaseDto): Purchase {
        return purchaseApi.createPurchase(data)
    }

    override suspend fun submitPurchase(id: String) {
        purchaseApi.submitPurchase(id)
    }

    override suspend fun recordPayment(id: String, amount: Double, method: String, reference: String?, notes: String?): Purchase {
        return purchaseApi.recordPayment(id, RecordPaymentDto(amount, method, reference, notes))
    }
}
