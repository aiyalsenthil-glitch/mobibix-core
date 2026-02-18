package com.aiyal.mobibix.data.network

import com.aiyal.mobibix.data.network.dto.CreateCustomerRequest
import com.aiyal.mobibix.data.network.dto.CustomerResponse
import com.aiyal.mobibix.data.network.dto.PaginatedCustomerResponse
import com.aiyal.mobibix.data.network.dto.UpdateCustomerRequest
import retrofit2.Response
import retrofit2.http.*

interface CustomerApi {

    @GET("api/core/customers")
    suspend fun listCustomers(
        @Query("skip") skip: Int? = null,
        @Query("take") take: Int? = null,
        @Query("search") search: String? = null
    ): PaginatedCustomerResponse 

    @GET("api/core/customers/search")
    suspend fun searchCustomers(
        @Query("query") query: String,
        @Query("limit") limit: Int = 5
    ): List<CustomerResponse>

    @GET("api/core/customers/by-phone")
    suspend fun getCustomerByPhone(@Query("phone") phone: String): Response<CustomerResponse>

    @GET("api/core/customers/{id}")
    suspend fun getCustomer(@Path("id") id: String): CustomerResponse

    @POST("api/core/customers")
    suspend fun createCustomer(@Body request: CreateCustomerRequest): CustomerResponse

    @PUT("api/core/customers/{id}")
    suspend fun updateCustomer(
        @Path("id") id: String,
        @Body request: UpdateCustomerRequest
    ): CustomerResponse
    
    @DELETE("api/core/customers/{id}")
    suspend fun deleteCustomer(@Path("id") id: String): Response<Unit>
}
