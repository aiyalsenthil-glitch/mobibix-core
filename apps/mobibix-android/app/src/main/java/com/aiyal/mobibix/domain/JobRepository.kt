package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.JobCardResponse
import com.aiyal.mobibix.data.network.dto.CreateJobRequest
import com.aiyal.mobibix.data.network.dto.UpdateJobRequest

interface JobRepository {
    suspend fun getJobs(shopId: String): List<JobCardResponse>
    suspend fun getJobDetails(shopId: String, jobId: String): JobCardResponse
    suspend fun createJob(shopId: String, request: CreateJobRequest): JobCardResponse
    suspend fun updateJob(shopId: String, jobId: String, request: UpdateJobRequest): JobCardResponse
    suspend fun updateStatus(shopId: String, jobId: String, status: String)
}
