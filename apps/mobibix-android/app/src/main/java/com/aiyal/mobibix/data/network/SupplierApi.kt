package com.aiyal.mobibix.data.network

import retrofit2.http.*

data class Supplier(
    val id: String,
    val tenantId: String,
    val name: String,
    val contactPerson: String?,
    val email: String?,
    val phone: String?,
    val address: String?,
    val gstNumber: String?,
    val notes: String?,
    val createdAt: String,
    val updatedAt: String
)

data class CreateSupplierDto(
    val name: String,
    val contactPerson: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val gstNumber: String? = null,
    val notes: String? = null
)

data class SupplierListResponse(
    val data: List<Supplier>,
    val total: Int
)

interface SupplierApi {
    @GET("api/suppliers")
    suspend fun listSuppliers(): List<Supplier> // Backend sometimes returns array directly

    @POST("api/suppliers")
    suspend fun createSupplier(@Body data: CreateSupplierDto): Supplier

    @GET("api/suppliers/{id}")
    suspend fun getSupplier(@Path("id") id: String): Supplier
}
