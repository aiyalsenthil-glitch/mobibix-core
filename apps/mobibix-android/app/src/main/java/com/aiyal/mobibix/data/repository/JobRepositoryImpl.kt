package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.AddAdvanceRequest
import com.aiyal.mobibix.data.network.AddPartRequest
import com.aiyal.mobibix.data.network.JobApi
import com.aiyal.mobibix.data.network.JobCardResponse
import com.aiyal.mobibix.data.network.RefundDetails
import com.aiyal.mobibix.data.network.UpdateStatusRequest
import com.aiyal.mobibix.data.network.dto.CreateJobRequest
import com.aiyal.mobibix.data.network.dto.UpdateJobRequest
import com.aiyal.mobibix.domain.JobRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class JobRepositoryImpl @Inject constructor(
    private val api: JobApi
) : JobRepository {

    override suspend fun getJobs(shopId: String): List<JobCardResponse> {
        return api.getJobs(shopId).jobCards
    }

    override suspend fun getJobDetails(shopId: String, jobId: String): JobCardResponse {
        return api.getJobDetails(shopId, jobId)
    }

    override suspend fun createJob(shopId: String, request: CreateJobRequest): JobCardResponse {
        return api.createJob(shopId, request)
    }

    override suspend fun updateJob(shopId: String, jobId: String, request: UpdateJobRequest): JobCardResponse {
        return api.updateJob(shopId, jobId, request)
    }

    override suspend fun updateStatus(
        shopId: String,
        jobId: String,
        status: String,
        refundDetails: RefundDetails?,
        reason: String?
    ) {
        api.updateStatus(
            shopId, jobId,
            UpdateStatusRequest(status = status, refundDetails = refundDetails, reason = reason)
        )
    }

    override suspend fun addPart(shopId: String, jobId: String, request: AddPartRequest): JobCardResponse {
        return api.addPart(shopId, jobId, request)
    }

    override suspend fun removePart(shopId: String, jobId: String, partId: String): JobCardResponse {
        return api.removePart(shopId, jobId, partId)
    }

    override suspend fun addAdvance(shopId: String, jobId: String, request: AddAdvanceRequest): JobCardResponse {
        return api.addAdvance(shopId, jobId, request)
    }

    override suspend fun createWarrantyJob(shopId: String, jobId: String): JobCardResponse {
        return api.createWarrantyJob(shopId, jobId)
    }
}
