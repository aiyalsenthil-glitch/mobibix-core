package com.aiyal.mobibix.data.network

import com.aiyal.mobibix.core.auth.PartnerTokenStore
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import com.google.gson.GsonBuilder

/**
 * Wraps PartnerApi to inject the partner Bearer token dynamically on each request.
 * Login endpoint is called without a token; all other endpoints use the stored token.
 */
object PartnerApiFactory {
    fun create(baseRetrofit: Retrofit, tokenStore: PartnerTokenStore): PartnerApi {
        val tokenAwareClient = baseRetrofit.callFactory().let { factory ->
            // Rebuild with a token interceptor
            (baseRetrofit as? Any)  // use the existing baseUrl/converters
        }

        // Create a dynamic proxy that adds Authorization header for non-login calls
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val original = chain.request()
                val token = tokenStore.getToken()
                val request = if (token != null && !original.url.encodedPath.contains("/auth/login")) {
                    original.newBuilder()
                        .header("Authorization", "Bearer $token")
                        .build()
                } else {
                    original
                }
                chain.proceed(request)
            }
            .build()

        return baseRetrofit.newBuilder()
            .client(client)
            .build()
            .create(PartnerApi::class.java)
    }
}
