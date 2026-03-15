package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.CustomerApi
import com.aiyal.mobibix.data.network.dto.CreateCustomerRequest
import com.aiyal.mobibix.data.network.dto.CustomerResponse
import com.aiyal.mobibix.data.network.dto.PaginatedCustomerResponse
import com.aiyal.mobibix.data.network.dto.UpdateCustomerRequest
import com.aiyal.mobibix.domain.CustomerRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CustomerRepositoryImpl @Inject constructor(
    private val api: CustomerApi
) : CustomerRepository {

    override suspend fun listCustomers(skip: Int?, take: Int?, search: String?): PaginatedCustomerResponse {
        return api.listCustomers(skip, take, search)
    }

    override suspend fun searchCustomers(query: String, limit: Int): List<CustomerResponse> {
        return api.searchCustomers(query, limit)
    }

    override suspend fun getCustomerByPhone(phone: String): CustomerResponse? {
        val response = api.getCustomerByPhone(phone)
        return if (response.isSuccessful) response.body() else null
    }

    override suspend fun getCustomer(id: String): CustomerResponse {
        return api.getCustomer(id)
    }

    override suspend fun createCustomer(request: CreateCustomerRequest): CustomerResponse {
        return api.createCustomer(request)
    }

    override suspend fun updateCustomer(id: String, request: UpdateCustomerRequest): CustomerResponse {
        return api.updateCustomer(id, request)
    }

    override suspend fun deleteCustomer(id: String) {
        api.deleteCustomer(id)
    }
}
