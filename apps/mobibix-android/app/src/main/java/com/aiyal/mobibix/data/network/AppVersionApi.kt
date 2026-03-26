package com.aiyal.mobibix.data.network

import retrofit2.http.GET
import retrofit2.http.Query

data class AppVersionResponse(
    val platform: String?,
    val minVersionCode: Int,
    val latestVersionCode: Int,
    val latestVersionName: String?,
    val updateUrl: String?,
    val releaseNotes: String?
)

interface AppVersionApi {
    @GET("api/app/version")
    suspend fun getVersion(@Query("platform") platform: String = "mobibix"): AppVersionResponse
}
