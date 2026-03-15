package com.aiyal.mobibix.ui.features.print

import android.graphics.Bitmap

data class JobCardPrintData(
    val jobNumber: String,
    val createdAt: String,
    val createdBy: String,
    val customerName: String,
    val customerPhone: String,
    val customerAltPhone: String,
    val deviceType: String,
    val deviceBrand: String,
    val deviceModel: String,
    val deviceSerial: String,
    val complaint: String,
    val physicalCondition: String,
    val estimatedCost: Double,
    val advancePaid: Double,
    val balanceDue: Double,
    val estimatedDelivery: String,
    val shopName: String,
    val shopPhone: String,
    val terms: List<String>,
    val qrBitmap: Bitmap
)
