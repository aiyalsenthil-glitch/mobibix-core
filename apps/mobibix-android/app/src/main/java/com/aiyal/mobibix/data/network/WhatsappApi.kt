package com.aiyal.mobibix.data.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

data class WhatsappTemplate(
    val id: String,
    val name: String,
    val language: String,
    val category: String, // UTILITY, MARKETING, AUTHENTICATION
    val components: List<TemplateComponent>,
    val status: String
)

data class TemplateComponent(
    val type: String, // HEADER, BODY, FOOTER, BUTTONS
    val text: String? = null,
    val format: String? = null // TEXT, IMAGE, VIDEO, DOCUMENT
)

data class WhatsappCampaign(
    val id: String,
    val name: String,
    val templateName: String,
    val scheduledTime: String?,
    val status: String, // DRAFT, SCHEDULED, SENT, FAILED
    val sentCount: Int,
    val deliveredCount: Int,
    val readCount: Int
)

data class SendMessageRequest(
    val shopId: String,
    val phoneNumber: String,
    val templateName: String,
    val language: String,
    val parameters: List<String> = emptyList()
)

data class SendMessageResponse(
    val success: Boolean,
    val messageId: String? = null,
    val error: String? = null
)

data class CreateCampaignRequest(
    val shopId: String,
    val name: String,
    val templateName: String,
    val audienceFilter: String, // e.g. "ALL_CUSTOMERS", "HIGH_VALUE"
    val scheduledTime: String? = null
)

interface WhatsappApi {
    @GET("api/whatsapp/templates")
    suspend fun getTemplates(@Query("shopId") shopId: String): List<WhatsappTemplate>

    @POST("api/whatsapp/send")
    suspend fun sendMessage(@Body request: SendMessageRequest): SendMessageResponse

    @GET("api/whatsapp/campaigns")
    suspend fun getCampaigns(@Query("shopId") shopId: String): List<WhatsappCampaign>

    @POST("api/whatsapp/campaigns")
    suspend fun createCampaign(@Body request: CreateCampaignRequest): WhatsappCampaign
}
