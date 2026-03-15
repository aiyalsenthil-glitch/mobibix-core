package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.AddAdvanceRequest
import com.aiyal.mobibix.data.network.AddPartRequest
import com.aiyal.mobibix.data.network.JobCardResponse
import com.aiyal.mobibix.data.network.RefundDetails
import com.aiyal.mobibix.data.network.dto.CreateJobRequest
import com.aiyal.mobibix.data.network.dto.UpdateJobRequest

interface JobRepository {
    suspend fun getJobs(shopId: String): List<JobCardResponse>
    suspend fun getJobDetails(shopId: String, jobId: String): JobCardResponse
    suspend fun createJob(shopId: String, request: CreateJobRequest): JobCardResponse
    suspend fun updateJob(shopId: String, jobId: String, request: UpdateJobRequest): JobCardResponse
    suspend fun updateStatus(
        shopId: String,
        jobId: String,
        status: String,
        refundDetails: RefundDetails? = null,
        reason: String? = null
    )
    suspend fun addPart(shopId: String, jobId: String, request: AddPartRequest): JobCardResponse
    suspend fun removePart(shopId: String, jobId: String, partId: String): JobCardResponse
    suspend fun addAdvance(shopId: String, jobId: String, request: AddAdvanceRequest): JobCardResponse
    suspend fun createWarrantyJob(shopId: String, jobId: String): JobCardResponse
    suspend fun generateRepairBill(jobId: String, request: com.aiyal.mobibix.data.network.RepairBillRequest)
}
