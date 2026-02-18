package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.dto.CreateCustomerRequest
import com.aiyal.mobibix.data.network.dto.CustomerResponse
import com.aiyal.mobibix.data.network.dto.PaginatedCustomerResponse
import com.aiyal.mobibix.data.network.dto.UpdateCustomerRequest

interface CustomerRepository {
    suspend fun listCustomers(skip: Int? = null, take: Int? = null, search: String? = null): PaginatedCustomerResponse
    suspend fun searchCustomers(query: String, limit: Int = 5): List<CustomerResponse>
    suspend fun getCustomerByPhone(phone: String): CustomerResponse?
    suspend fun getCustomer(id: String): CustomerResponse
    suspend fun createCustomer(request: CreateCustomerRequest): CustomerResponse
    suspend fun updateCustomer(id: String, request: UpdateCustomerRequest): CustomerResponse
    suspend fun deleteCustomer(id: String)
}
