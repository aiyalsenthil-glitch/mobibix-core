package com.aiyal.mobibix.data.network.dto

data class UpdateJobRequest(
    val customerName: String? = null,
    val customerPhone: String? = null,
    val customerAltPhone: String? = null,
    val deviceBrand: String? = null,
    val deviceModel: String? = null,
    val deviceType: String? = null,
    val deviceSerial: String? = null,
    val customerComplaint: String? = null,
    val physicalCondition: String? = null,
    val estimatedCost: Double? = null,   // Double: matches CreateJobRequest and backend @IsNumber()
    val advancePaid: Double? = null,     // Double: avoids truncation on fractional amounts
    val laborCharge: Int? = null,        // Added: explicitly set repair labor charge in Rupees
    val estimatedDelivery: String? = null,
    val notes: String? = null
)

