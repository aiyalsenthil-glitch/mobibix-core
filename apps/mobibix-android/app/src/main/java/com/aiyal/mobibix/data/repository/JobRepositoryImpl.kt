package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.JobApi
import com.aiyal.mobibix.data.network.JobCardResponse
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
        return api.getJobs(shopId)
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

    override suspend fun updateStatus(shopId: String, jobId: String, status: String) {
        api.updateStatus(shopId, jobId, UpdateStatusRequest(status))
    }
}
