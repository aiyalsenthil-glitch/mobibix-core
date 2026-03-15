package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.CreateSupplierDto
import com.aiyal.mobibix.data.network.Supplier
import com.aiyal.mobibix.data.network.SupplierApi
import com.aiyal.mobibix.domain.SupplierRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SupplierRepositoryImpl @Inject constructor(
    private val supplierApi: SupplierApi
) : SupplierRepository {
    override suspend fun listSuppliers(): List<Supplier> {
        return supplierApi.listSuppliers()
    }

    override suspend fun createSupplier(data: CreateSupplierDto): Supplier {
        return supplierApi.createSupplier(data)
    }

    override suspend fun getSupplier(id: String): Supplier {
        return supplierApi.getSupplier(id)
    }
}
