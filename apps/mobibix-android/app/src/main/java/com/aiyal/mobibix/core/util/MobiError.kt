package com.aiyal.mobibix.core.util

import retrofit2.HttpException
import org.json.JSONObject

/**
 * MobiError
 * 
 * Utility to extract clean error messages from backend responses.
 * Backend standard error format: { "message": "...", "error": "...", "statusCode": 400 }
 */
object MobiError {
    fun extractMessage(throwable: Throwable): String {
        return when (throwable) {
            is HttpException -> {
                try {
                    val errorBody = throwable.response()?.errorBody()?.string()
                    if (errorBody.isNullOrBlank()) return "Server error (${throwable.code()})"
                    
                    val json = JSONObject(errorBody)
                    // Nest standard error format or direct message
                    json.optString("message", "Unknown server error")
                } catch (e: Exception) {
                    "Server error (${throwable.code()})"
                }
            }
            else -> throwable.message ?: "An unexpected error occurred"
        }
    }
}
