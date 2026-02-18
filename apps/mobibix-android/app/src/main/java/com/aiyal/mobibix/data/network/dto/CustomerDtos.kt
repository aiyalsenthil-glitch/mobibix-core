package com.aiyal.mobibix.data.network.dto

import com.google.gson.annotations.SerializedName

data class CustomerResponse(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("phone") val phone: String,
    @SerializedName("email") val email: String?,
    @SerializedName("state") val state: String,
    @SerializedName("businessType") val businessType: String, // B2C, B2B
    @SerializedName("partyType") val partyType: String, // CUSTOMER, VENDOR, BOTH
    @SerializedName("gstNumber") val gstNumber: String?,
    @SerializedName("loyaltyPoints") val loyaltyPoints: Double,
    @SerializedName("isActive") val isActive: Boolean
)

data class CreateCustomerRequest(
    @SerializedName("name") val name: String,
    @SerializedName("phone") val phone: String,
    @SerializedName("email") val email: String?,
    @SerializedName("state") val state: String,
    @SerializedName("businessType") val businessType: String,
    @SerializedName("partyType") val partyType: String,
    @SerializedName("gstNumber") val gstNumber: String?
)

data class UpdateCustomerRequest(
    @SerializedName("name") val name: String?,
    @SerializedName("email") val email: String?,
    @SerializedName("state") val state: String?,
    @SerializedName("businessType") val businessType: String?,
    @SerializedName("partyType") val partyType: String?,
    @SerializedName("gstNumber") val gstNumber: String?
)

data class PaginatedCustomerResponse(
    @SerializedName("data") val data: List<CustomerResponse>,
    @SerializedName("total") val total: Int,
    @SerializedName("skip") val skip: Int,
    @SerializedName("take") val take: Int
)
