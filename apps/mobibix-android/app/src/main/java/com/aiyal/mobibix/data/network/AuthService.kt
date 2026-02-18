package com.aiyal.mobibix.data.network

import com.aiyal.mobibix.data.network.dto.ExchangeTokenRequest
import com.aiyal.mobibix.data.network.dto.ExchangeTokenResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthService {
    @POST("api/auth/google/exchange")
    suspend fun exchangeToken(@Body request: ExchangeTokenRequest): Response<ExchangeTokenResponse>
}
