package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.*

interface PurchaseRepository {
    suspend fun listPurchases(shopId: String, status: PurchaseStatus? = null, skip: Int = 0, take: Int = 50): List<Purchase>
    suspend fun getPurchase(id: String): Purchase
    suspend fun createPurchase(data: CreatePurchaseDto): Purchase
    suspend fun submitPurchase(id: String)
    suspend fun recordPayment(id: String, amount: Double, method: String, reference: String?, notes: String?): Purchase

    // Purchase Orders
    suspend fun listPurchaseOrders(shopId: String?, status: PurchaseOrderStatus? = null): List<PurchaseOrder>
    suspend fun getPurchaseOrder(id: String): PurchaseOrder
    suspend fun createPurchaseOrder(data: CreatePurchaseOrderDto): PurchaseOrder
    suspend fun transitionPOStatus(id: String, status: PurchaseOrderStatus): PurchaseOrder

    // GRNs
    suspend fun listGrns(shopId: String?): List<GRN>
    suspend fun getGrn(id: String): GRN
    suspend fun createGrn(data: CreateGRNDto): GRN
    suspend fun confirmGrn(id: String): GRN
}
