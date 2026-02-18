package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.*

interface PurchaseRepository {
    suspend fun listPurchases(shopId: String, status: PurchaseStatus? = null, skip: Int = 0, take: Int = 50): List<Purchase>
    suspend fun getPurchase(id: String): Purchase
    suspend fun createPurchase(data: CreatePurchaseDto): Purchase
    suspend fun submitPurchase(id: String)
    suspend fun recordPayment(id: String, amount: Double, method: String, reference: String?, notes: String?): Purchase
}
