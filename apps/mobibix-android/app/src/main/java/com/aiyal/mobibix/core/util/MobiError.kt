package com.aiyal.mobibix.core.util

import retrofit2.HttpException
import org.json.JSONObject
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

/**
 * MobiError — centralized error message extraction.
 * Maps backend error codes and HTTP status codes to user-friendly messages.
 */
object MobiError {

    private val codeMessages = mapOf(
        // Auth
        "AUTH_001" to "Invalid credentials. Please check your email and password.",
        "AUTH_002" to "Session expired. Please log in again.",
        "AUTH_003" to "Invalid session. Please log in again.",
        "AUTH_005" to "You are not authorized to perform this action.",
        "AUTH_006" to "Access denied. You don't have permission.",
        // Validation
        "VAL_301" to "Some fields are invalid. Please check your input.",
        "VAL_302" to "Invalid email address.",
        "VAL_303" to "Invalid phone number.",
        "VAL_304" to "Invalid amount entered.",
        "VAL_305" to "Required field is missing.",
        // Tenant
        "TENANT_101" to "Shop account not found.",
        // DB
        "DB_501" to "This record already exists.",
        "DB_502" to "Cannot delete — this item is being used elsewhere.",
        "DB_503" to "Record not found.",
        // System
        "SYS_701" to "Something went wrong on the server. Please try again.",
        "SYS_702" to "Service is temporarily unavailable.",
        "SYS_703" to "Request timed out. Please try again.",
    )

    fun extractMessage(throwable: Throwable): String {
        return when (throwable) {
            is SocketTimeoutException -> "Connection timed out. Check your internet and try again."
            is UnknownHostException -> "No internet connection. Please check your network."
            is IOException -> "Network error. Please check your connection."
            is HttpException -> extractHttpMessage(throwable)
            else -> throwable.message?.takeIf { it.isNotBlank() } ?: "An unexpected error occurred."
        }
    }

    private fun extractHttpMessage(e: HttpException): String {
        val code = e.code()
        // Try to parse the backend JSON error body
        return try {
            val body = e.response()?.errorBody()?.string()
            if (!body.isNullOrBlank()) {
                val json = JSONObject(body)
                // Check for backend error code first
                val errorCode = json.optString("code", "")
                if (errorCode.isNotBlank()) {
                    codeMessages[errorCode] ?: json.optString("message", "")
                        .takeIf { it.isNotBlank() } ?: httpStatusMessage(code)
                } else {
                    // Fallback to message field
                    val msg = json.optString("message", "")
                    msg.takeIf { it.isNotBlank() } ?: httpStatusMessage(code)
                }
            } else {
                httpStatusMessage(code)
            }
        } catch (_: Exception) {
            httpStatusMessage(code)
        }
    }

    private fun httpStatusMessage(code: Int): String = when (code) {
        400 -> "Invalid request. Please check your input."
        401 -> "Session expired. Please log in again."
        403 -> "You don't have permission to do that."
        404 -> "The requested item was not found."
        409 -> "A conflict occurred. This record may already exist."
        422 -> "Validation failed. Please check all fields."
        429 -> "Too many requests. Please wait a moment."
        500 -> "Server error. Please try again later."
        503 -> "Service unavailable. Please try again later."
        else -> "Error $code. Please try again."
    }
}
