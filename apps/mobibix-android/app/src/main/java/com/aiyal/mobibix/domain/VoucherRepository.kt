package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.CreateVoucherRequest
import com.aiyal.mobibix.data.network.PaymentVoucher
import com.aiyal.mobibix.data.network.VoucherType

interface VoucherRepository {
    suspend fun getVouchers(startDate: String? = null, endDate: String? = null, voucherType: VoucherType? = null, skip: Int = 0, take: Int = 50): List<PaymentVoucher>
    suspend fun createVoucher(request: CreateVoucherRequest): PaymentVoucher
    suspend fun cancelVoucher(id: String, reason: String): PaymentVoucher
}
