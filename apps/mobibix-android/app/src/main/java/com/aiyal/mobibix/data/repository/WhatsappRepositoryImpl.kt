package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.CreateCampaignRequest
import com.aiyal.mobibix.data.network.SendMessageRequest
import com.aiyal.mobibix.data.network.SendMessageResponse
import com.aiyal.mobibix.data.network.WhatsappApi
import com.aiyal.mobibix.data.network.WhatsappCampaign
import com.aiyal.mobibix.data.network.WhatsappTemplate
import com.aiyal.mobibix.domain.WhatsappRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WhatsappRepositoryImpl @Inject constructor(
    private val api: WhatsappApi
) : WhatsappRepository {
    override suspend fun getTemplates(shopId: String): List<WhatsappTemplate> =
        api.getTemplates(shopId)

    override suspend fun sendMessage(request: SendMessageRequest): SendMessageResponse =
        api.sendMessage(request)

    override suspend fun getCampaigns(shopId: String): List<WhatsappCampaign> =
        api.getCampaigns(shopId)

    override suspend fun createCampaign(request: CreateCampaignRequest): WhatsappCampaign =
        api.createCampaign(request)
}
