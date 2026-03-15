package com.aiyal.mobibix.data.network

import retrofit2.http.*

// ─── Inventory Intelligence Models ───────────────────────────────────────────

data class InventoryOverview(
    val totalLossValue: Double = 0.0,
    val totalLossQty: Int = 0,
    val sessionsAnalyzed: Int = 0,
    val topLossReason: String? = null
)

data class InventoryTopProduct(
    val productId: String,
    val productName: String,
    val category: String? = null,
    val lossQty: Int,
    val lossValue: Double
)

data class InventoryByCategory(
    val category: String,
    val lossQty: Int,
    val lossValue: Double,
    val affectedProducts: Int = 0,
    val percentOfTotal: Double = 0.0
)

data class InventoryMonthlyTrend(
    val month: String,
    val lossQty: Int,
    val lossValue: Double
)

data class InventoryIntelligence(
    val overview: InventoryOverview = InventoryOverview(),
    val topProducts: List<InventoryTopProduct> = emptyList(),
    val byCategory: List<InventoryByCategory> = emptyList(),
    val monthlyTrend: List<InventoryMonthlyTrend> = emptyList(),
    val insights: List<String> = emptyList()
)

// ─── Compatibility Models ─────────────────────────────────────────────────────

data class PhoneModelSuggestion(
    val id: String,
    val modelName: String,
    val brandName: String,
    val fullName: String
)

data class CompatiblePart(
    val id: String,
    val name: String,
    val source: String, // "PART_CATALOG" or "INVENTORY"
    val price: Double? = null,
    val quantity: Int? = null
)

data class CompatibilityResponse(
    val model: String,
    val compatibleParts: Map<String, List<CompatiblePart>> = emptyMap()
)

// ─── AI Chat Models ───────────────────────────────────────────────────────────

data class AiChatMessage(
    val role: String, // "user" or "assistant"
    val content: String,
    val timestamp: Long = System.currentTimeMillis()
)

data class AiChatRequest(
    val message: String,
    val context: String? = null,
    val history: List<AiChatMessage> = emptyList()
)

data class AiChatResponse(
    val reply: String,
    val suggestions: List<String> = emptyList()
)

// ─── API ─────────────────────────────────────────────────────────────────────

interface IntelligenceApi {

    // Inventory Intelligence
    @GET("api/reports/inventory-intelligence")
    suspend fun getInventoryIntelligence(
        @Query("shopId") shopId: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): InventoryIntelligence

    @GET("api/reports/inventory-intelligence/top-loss-products")
    suspend fun getTopLossProducts(
        @Query("shopId") shopId: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): List<InventoryTopProduct>

    @GET("api/reports/inventory-intelligence/monthly-loss-trend")
    suspend fun getMonthlyLossTrend(@Query("shopId") shopId: String): List<InventoryMonthlyTrend>

    // Compatibility
    @GET("api/compatibility/autocomplete")
    suspend fun autocompletePhoneModels(@Query("query") query: String): List<PhoneModelSuggestion>

    @GET("api/compatibility/search")
    suspend fun searchCompatibility(@Query("model") model: String): CompatibilityResponse
}
