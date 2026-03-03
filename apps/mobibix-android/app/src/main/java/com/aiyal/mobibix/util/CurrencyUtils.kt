package com.aiyal.mobibix.util

import java.text.NumberFormat
import java.util.Locale

/**
 * CurrencyUtils: Centralized currency formatting for MobiBix Android
 * Uses Indian Locale (en-IN) to ensure correct numbering system and ₹ symbol.
 */
object CurrencyUtils {
    private val locale = Locale("en", "IN")
    private val currencyFormat = NumberFormat.getCurrencyInstance(locale).apply {
        minimumFractionDigits = 2
        maximumFractionDigits = 2
    }

    /**
     * Format PAISE (Int) to Rupee String (₹1,00,000.00)
     */
    fun formatPaise(paise: Int): String {
        return currencyFormat.format(paise / 100.0)
    }

    /**
     * Format RUPEES (Double/Float) to Rupee String
     */
    fun formatRupees(rupees: Double): String {
        return currencyFormat.format(rupees)
    }

    /**
     * Get currency symbol (₹)
     */
    val currencySymbol: String
        get() = "₹"

    /**
     * Convert Paise to Rupee double
     */
    fun paiseToRupees(paise: Int): Double {
        return paise / 100.0
    }
}
