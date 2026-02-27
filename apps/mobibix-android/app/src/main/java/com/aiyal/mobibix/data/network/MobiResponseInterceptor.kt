package com.aiyal.mobibix.data.network

import okhttp3.Interceptor
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.json.JSONObject
import javax.inject.Inject

/**
 * MobiResponseInterceptor
 * 
 * Automatically unwraps the backend's standard response format:
 * { "success": true, "data": { ... }, ... }
 * 
 * If the response contains "success": true and has a "data" field, 
 * this interceptor replaces the response body with just the content of "data".
 * This allows our Retrofit interfaces and Gson DTOs to remain clean.
 */
class MobiResponseInterceptor @Inject constructor() : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val response = chain.proceed(chain.request())
        
        if (!response.isSuccessful) return response
        
        val bodyString = response.body?.string() ?: return response
        
        return try {
            val json = JSONObject(bodyString)
            
            // Check if it's a wrapped response
            if (json.has("success") && json.optBoolean("success") && json.has("data")) {
                val dataContent = json.opt("data")
                val unwrappedBody = dataContent?.toString() ?: "null"
                
                response.newBuilder()
                    .body(unwrappedBody.toResponseBody(response.body?.contentType()))
                    .build()
            } else {
                // Not wrapped or unsuccessful according to structure, return as is
                response.newBuilder()
                    .body(bodyString.toResponseBody(response.body?.contentType()))
                    .build()
            }
        } catch (e: Exception) {
            // Not a JSON or error parsing, return original
            response.newBuilder()
                .body(bodyString.toResponseBody(response.body?.contentType()))
                .build()
        }
    }
}
