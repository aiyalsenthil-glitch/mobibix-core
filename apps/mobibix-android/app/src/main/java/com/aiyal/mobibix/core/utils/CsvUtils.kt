package com.aiyal.mobibix.core.utils

import com.aiyal.mobibix.data.network.ShopProduct
import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader

object CsvUtils {

    fun generateProductCsv(products: List<ShopProduct>): String {
        val header = "Name,Category,SalePrice,CostPrice,StockQty,SKU"
        val rows = products.joinToString("\n") { p ->
            val name = p.name.replace(",", " ") // Simple CSV escaping
            val category = p.category?.replace(",", " ") ?: ""
            val sale = (p.salePrice ?: 0) / 100.0
            val cost = (p.costPrice ?: 0) / 100.0
            val stock = p.stockQty
            val sku = p.sku ?: ""
            "$name,$category,$sale,$cost,$stock,$sku"
        }
        return "$header\n$rows"
    }

    data class CsvProductRow(
        val name: String,
        val category: String,
        val salePrice: Double,
        val costPrice: Double,
        val stockQty: Int,
        val sku: String
    )

    fun parseProductCsv(inputStream: InputStream): List<CsvProductRow> {
        val reader = BufferedReader(InputStreamReader(inputStream))
        val rows = mutableListOf<CsvProductRow>()
        
        try {
            // content could be empty
            val headerLine = reader.readLine() // Skip header
            if (headerLine == null) return emptyList()

            var line = reader.readLine()
            while (line != null) {
                if (line.isNotBlank()) {
                    val parts = line.split(",")
                    if (parts.size >= 3) { // rudimentary validation
                        val name = parts.getOrElse(0) { "" }.trim()
                        if (name.isNotEmpty()) {
                            rows.add(
                                CsvProductRow(
                                    name = name,
                                    category = parts.getOrElse(1) { "" }.trim(),
                                    salePrice = parts.getOrElse(2) { "0" }.trim().toDoubleOrNull() ?: 0.0,
                                    costPrice = parts.getOrElse(3) { "0" }.trim().toDoubleOrNull() ?: 0.0,
                                    stockQty = parts.getOrElse(4) { "0" }.trim().toIntOrNull() ?: 0,
                                    sku = parts.getOrElse(5) { "" }.trim()
                                )
                            )
                        }
                    }
                }
                line = reader.readLine()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            // Return whatever we managed to parse
        }
        return rows
    }
}
