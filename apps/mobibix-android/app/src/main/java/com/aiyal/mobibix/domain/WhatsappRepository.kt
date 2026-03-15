package com.aiyal.mobibix.domain

import com.aiyal.mobibix.data.network.CreateCampaignRequest
import com.aiyal.mobibix.data.network.SendMessageRequest
import com.aiyal.mobibix.data.network.SendMessageResponse
import com.aiyal.mobibix.data.network.WhatsappCampaign
import com.aiyal.mobibix.data.network.WhatsappTemplate

interface WhatsappRepository {
    suspend fun getTemplates(shopId: String): List<WhatsappTemplate>
    suspend fun sendMessage(request: SendMessageRequest): SendMessageResponse
    suspend fun getCampaigns(shopId: String): List<WhatsappCampaign>
    suspend fun createCampaign(request: CreateCampaignRequest): WhatsappCampaign
}
