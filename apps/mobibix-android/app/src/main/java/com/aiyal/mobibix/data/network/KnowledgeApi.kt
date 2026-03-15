package com.aiyal.mobibix.data.network

import retrofit2.http.*

// ─── Models ──────────────────────────────────────────────────────────────────

data class FaultType(val id: String, val name: String)

data class FaultDiagnosisStep(val id: String, val order: Int, val stepText: String)

data class FaultDiagnosis(
    val id: String,
    val faultTypeId: String,
    val description: String? = null,
    val steps: List<FaultDiagnosisStep> = emptyList(),
    val faultType: FaultType? = null
)

data class RepairNote(
    val id: String,
    val faultTypeId: String,
    val content: String,
    val videoUrl: String? = null,
    val status: String = "APPROVED",
    val source: String = "SYSTEM",
    val helpfulCount: Int = 0,
    val notHelpfulCount: Int = 0,
    val createdAt: String? = null
)

data class KnowledgeForJobResponse(
    val checklist: FaultDiagnosis? = null,
    val notes: List<RepairNote> = emptyList(),
    val suggestedFaultTypes: List<FaultType>? = null,
    val jobDetails: JobKnowledgeDetails? = null
)

data class JobKnowledgeDetails(
    val brand: String,
    val model: String,
    val problem: String,
    val phoneModelId: String? = null,
    val faultTypeId: String? = null
)

data class VoteNoteDto(val vote: String) // "helpful" or "notHelpful"

data class SubmitRepairNoteDto(
    val faultTypeId: String,
    val content: String,
    val videoUrl: String? = null,
    val phoneModelId: String? = null
)

// ─── API ─────────────────────────────────────────────────────────────────────

interface KnowledgeApi {

    @GET("api/mobileshop/knowledge/job/{jobCardId}")
    suspend fun getKnowledgeForJob(@Path("jobCardId") jobCardId: String): KnowledgeForJobResponse

    @GET("api/mobileshop/knowledge/fault-types")
    suspend fun listFaultTypes(): List<FaultType>

    @GET("api/mobileshop/knowledge/notes")
    suspend fun getRepairNotes(
        @Query("phoneModelId") phoneModelId: String? = null,
        @Query("faultTypeId") faultTypeId: String? = null
    ): List<RepairNote>

    @POST("api/mobileshop/knowledge/notes/{noteId}/vote")
    suspend fun voteOnNote(
        @Path("noteId") noteId: String,
        @Body dto: VoteNoteDto
    )

    @POST("api/mobileshop/knowledge/notes")
    suspend fun submitRepairNote(@Body dto: SubmitRepairNoteDto): RepairNote

    @GET("api/mobileshop/knowledge/checklist/{faultTypeId}")
    suspend fun getChecklist(@Path("faultTypeId") faultTypeId: String): FaultDiagnosis?
}
