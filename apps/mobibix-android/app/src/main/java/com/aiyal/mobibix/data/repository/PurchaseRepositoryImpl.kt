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

    override suspend fun listPurchaseOrders(shopId: String?, status: PurchaseOrderStatus?): List<PurchaseOrder> {
        return purchaseApi.listPurchaseOrders(shopId, status)
    }

    override suspend fun getPurchaseOrder(id: String): PurchaseOrder {
        return purchaseApi.getPurchaseOrder(id)
    }

    override suspend fun createPurchaseOrder(data: CreatePurchaseOrderDto): PurchaseOrder {
        return purchaseApi.createPurchaseOrder(data)
    }

    override suspend fun transitionPOStatus(id: String, status: PurchaseOrderStatus): PurchaseOrder {
        return purchaseApi.transitionPOStatus(id, status)
    }

    override suspend fun listGrns(shopId: String?): List<GRN> {
        return purchaseApi.listGrns(shopId)
    }

    override suspend fun getGrn(id: String): GRN {
        return purchaseApi.getGrn(id)
    }

    override suspend fun createGrn(data: CreateGRNDto): GRN {
        return purchaseApi.createGrn(data)
    }

    override suspend fun confirmGrn(id: String): GRN {
        return purchaseApi.confirmGrn(id)
    }
}
