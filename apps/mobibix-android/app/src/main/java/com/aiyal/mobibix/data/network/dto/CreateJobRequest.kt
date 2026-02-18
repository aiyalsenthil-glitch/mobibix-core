package com.aiyal.mobibix.data.network.dto

data class CreateJobRequest(
    val customerName: String,
    val customerPhone: String,
    val customerAltPhone: String?,
    val deviceBrand: String,
    val deviceModel: String,
    val deviceType: String,
    val deviceSerial: String?,
    val customerComplaint: String,
    val physicalCondition: String?,
    val estimatedCost: Double?,
    val advancePaid: Double,
    val estimatedDelivery: String?
)
