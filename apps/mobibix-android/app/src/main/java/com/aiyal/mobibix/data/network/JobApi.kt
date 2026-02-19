package com.aiyal.mobibix.data.network

import com.aiyal.mobibix.data.network.dto.CreateJobRequest
import com.aiyal.mobibix.data.network.dto.UpdateJobRequest
import com.aiyal.mobibix.model.JobStatus
import com.google.gson.annotations.JsonAdapter
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

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
    val advancePaid: Double,
    val estimatedDelivery: String?,
    @JsonAdapter(JobStatusAdapter::class) val status: JobStatus,
    val publicToken: String?,
    val shop: ShopInfo,
    val createdByName: String
)

data class ShopInfo(
    val id: String,
    val name: String,
    val phone: String
)

data class UpdateStatusRequest(
    val status: String
)

data class JobCardListResponse(
    val jobCards: List<JobCardResponse>,
    val empty: Boolean
)

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
}
