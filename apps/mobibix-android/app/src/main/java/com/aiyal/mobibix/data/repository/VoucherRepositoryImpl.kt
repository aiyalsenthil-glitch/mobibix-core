package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.CreateVoucherRequest
import com.aiyal.mobibix.data.network.PaymentVoucher
import com.aiyal.mobibix.data.network.VoucherApi
import com.aiyal.mobibix.data.network.VoucherType
import com.aiyal.mobibix.domain.VoucherRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class VoucherRepositoryImpl @Inject constructor(
    private val voucherApi: VoucherApi
) : VoucherRepository {
    override suspend fun getVouchers(startDate: String?, endDate: String?, voucherType: VoucherType?, skip: Int, take: Int): List<PaymentVoucher> {
        return voucherApi.getVouchers(startDate, endDate, null, null, voucherType, skip, take).data
    }

    override suspend fun createVoucher(request: CreateVoucherRequest): PaymentVoucher {
        return voucherApi.createVoucher(request)
    }

    override suspend fun cancelVoucher(id: String, reason: String): PaymentVoucher {
        return voucherApi.cancelVoucher(id, mapOf("reason" to reason))
    }
}
