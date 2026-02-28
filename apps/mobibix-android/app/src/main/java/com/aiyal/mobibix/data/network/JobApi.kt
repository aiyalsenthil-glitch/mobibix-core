package com.aiyal.mobibix.data.network

import com.aiyal.mobibix.data.network.dto.CreateJobRequest
import com.aiyal.mobibix.data.network.dto.UpdateJobRequest
import com.aiyal.mobibix.model.JobStatus
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

// ─────────────────────────────────────────────
// Response Models
// ─────────────────────────────────────────────

data class JobPartItem(
    val id: String,
    val productId: String,
    val productName: String,
    val quantity: Int,
    val unitPrice: Double,
    val totalPrice: Double
)

data class JobCardResponse(
    val id: String,
    val jobNumber: String,
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
    val finalCost: Double? = null,
    val laborCharge: Double? = null,
    val advancePaid: Double,
    val estimatedDelivery: String?,
    val deliveredAt: String? = null,
    val scrappedAt: String? = null,
    val warrantyDuration: Int? = null,
    val status: JobStatus,
    val publicToken: String?,
    val shop: ShopInfo,
    val createdByName: String,
    val parts: List<JobPartItem> = emptyList()
)

data class ShopInfo(
    val id: String,
    val name: String,
    val phone: String
)

data class JobCardListResponse(
    val jobCards: List<JobCardResponse>,
    val empty: Boolean
)

// ─────────────────────────────────────────────
// Request Models
// ─────────────────────────────────────────────

data class RefundDetails(
    val amount: Double,
    val mode: String   // "CASH" | "UPI" | "CARD"
)

data class UpdateStatusRequest(
    val status: String,
    val refundDetails: RefundDetails? = null,
    val reason: String? = null
)

data class AddPartRequest(
    val shopProductId: String,
    val quantity: Int
)

data class AddAdvanceRequest(
    val amount: Double,
    val mode: String   // "CASH" | "UPI" | "CARD"
)

// ─────────────────────────────────────────────
// API Interface
// ─────────────────────────────────────────────

interface JobApi {

    @GET("api/mobileshop/shops/{shopId}/job-cards")
    suspend fun getJobs(
        @Path("shopId") shopId: String
    ): JobCardListResponse

    @GET("api/mobileshop/shops/{shopId}/job-cards/{jobId}")
    suspend fun getJobDetails(
        @Path("shopId") shopId: String,
        @Path("jobId") jobId: String
    ): JobCardResponse

    @POST("api/mobileshop/shops/{shopId}/job-cards")
    suspend fun createJob(
        @Path("shopId") shopId: String,
        @Body request: CreateJobRequest
    ): JobCardResponse

    @PATCH("api/mobileshop/shops/{shopId}/job-cards/{jobId}")
    suspend fun updateJob(
        @Path("shopId") shopId: String,
        @Path("jobId") jobId: String,
        @Body request: UpdateJobRequest
    ): JobCardResponse

    @PATCH("api/mobileshop/shops/{shopId}/job-cards/{jobId}/status")
    suspend fun updateStatus(
        @Path("shopId") shopId: String,
        @Path("jobId") jobId: String,
        @Body body: UpdateStatusRequest
    )

    @POST("api/mobileshop/shops/{shopId}/job-cards/{jobId}/parts")
    suspend fun addPart(
        @Path("shopId") shopId: String,
        @Path("jobId") jobId: String,
        @Body request: AddPartRequest
    ): JobCardResponse

    @DELETE("api/mobileshop/shops/{shopId}/job-cards/{jobId}/parts/{partId}")
    suspend fun removePart(
        @Path("shopId") shopId: String,
        @Path("jobId") jobId: String,
        @Path("partId") partId: String
    ): JobCardResponse

    @POST("api/mobileshop/shops/{shopId}/job-cards/{jobId}/advance")
    suspend fun addAdvance(
        @Path("shopId") shopId: String,
        @Path("jobId") jobId: String,
        @Body request: AddAdvanceRequest
    ): JobCardResponse

    @POST("api/mobileshop/shops/{shopId}/job-cards/{jobId}/warranty-job")
    suspend fun createWarrantyJob(
        @Path("shopId") shopId: String,
        @Path("jobId") jobId: String
    ): JobCardResponse
}
