package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.CreateSupplierDto
import com.aiyal.mobibix.data.network.Supplier

interface SupplierRepository {
    suspend fun listSuppliers(): List<Supplier>
    suspend fun createSupplier(data: CreateSupplierDto): Supplier
    suspend fun getSupplier(id: String): Supplier
}
