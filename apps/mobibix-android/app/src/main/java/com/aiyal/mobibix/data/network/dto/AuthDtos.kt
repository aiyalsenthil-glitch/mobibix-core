package com.aiyal.mobibix.data.network.dto

import com.google.gson.annotations.SerializedName

data class ExchangeTokenRequest(
    @SerializedName("idToken") val idToken: String
)

data class ExchangeTokenResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("user") val user: UserDto,
    @SerializedName("tenant") val tenant: TenantDto?
)

data class UserDto(
    @SerializedName("id") val id: String,
    @SerializedName("email") val email: String,
    @SerializedName("name") val name: String?,
    @SerializedName("role") val role: String?,
    @SerializedName("isSystemOwner") val isSystemOwner: Boolean? = false,
    @SerializedName("permissions") val permissions: List<String>? = emptyList()
)

data class TenantDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("code") val code: String?
)
