package com.aiyal.mobibix.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

// Response wrapper for pagination
data class ProductListResponse(
    val data: List<ShopProduct>,
    val total: Int,
    val skip: Int,
    val take: Int
)

data class ShopProduct(
    val id: String,
    val name: String,
    val category: String?,
    val salePrice: Int?,     // In paise
    val costPrice: Int?,     // In paise
    val stockQty: Int,       // Derived from stock entries
    val sku: String?,
    val gstRate: Double?,    // GST rate as percentage e.g. 0.0, 5.0, 12.0, 18.0, 28.0
    val hsnCode: String?,    // HSN/SAC code — required for GST invoices
    val isSerialized: Boolean = false, // Whether product tracks individual IMEI/serials
    val warrantyDays: Int? = null      // Default warranty in days
)

data class CreateProductRequest(
    val shopId: String,
    val name: String,
    val type: String,
    val category: String? = null,
    val salePrice: Int, // paise
    val costPrice: Int? = null, // paise
    val hsnCode: String? = null,
    val gstRate: Float? = null,
    val isSerialized: Boolean = false
)

data class UpdateProductRequest(
    val shopId: String,
    val name: String? = null,
    val type: String? = null,
    val category: String? = null,
    val salePrice: Int? = null,
    val costPrice: Int? = null,
    val hsnCode: String? = null,
    val gstRate: Float? = null
)

data class StockInRequest(
    val productId: String,
    val type: String? = null,
    val quantity: Int,
    val costPerUnit: Int,
    val imeis: List<String>? = null
)

data class StockCorrectionRequest(
    val shopId: String,
    val shopProductId: String,
    val quantity: Int,
    val reason: String,
    val note: String? = null
)

interface ProductApi {

    @GET("api/mobileshop/products")
    suspend fun getProductsForShop(
        @Query("shopId") shopId: String,
        @Query("skip") skip: Int? = null,
        @Query("take") take: Int? = null
    ): ProductListResponse

    @POST("api/mobileshop/inventory/product")
    suspend fun createProduct(@Body request: CreateProductRequest): ShopProduct

    @PATCH("api/mobileshop/inventory/product/{id}")
    suspend fun updateProduct(
        @Path("id") id: String,
        @Body request: UpdateProductRequest
    ): ShopProduct

    @POST("api/mobileshop/inventory/stock-in")
    suspend fun stockIn(@Body request: StockInRequest)

    @POST("api/mobileshop/stock/correct")
    suspend fun correctStock(@Body request: StockCorrectionRequest)
}
