
package com.aiyal.mobibix.data.network.response

data class JobCardResponse(
    val customerAltPhone: String?,
    val deviceType: String,
    val deviceSerial: String?,
    val customerComplaint: String,
    val physicalCondition: String?,
    val advancePaid: Int,
    val estimatedDelivery: String?,
    val createdByName: String
)
