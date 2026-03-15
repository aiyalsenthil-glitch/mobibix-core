package com.aiyal.mobibix.data.network

import retrofit2.http.*

// ─── Models ──────────────────────────────────────────────────────────────────

data class PartnerLoginRequest(val email: String, val password: String)

data class PartnerLoginResponse(
    val token: String,
    val partner: PartnerProfile
)

data class PartnerProfile(
    val id: String,
    val name: String,
    val email: String,
    val phone: String? = null,
    val tier: String = "BRONZE", // BRONZE, SILVER, GOLD, PLATINUM
    val referralCode: String? = null,
    val commissionRate: Double = 0.0
)

data class PartnerDashboardStats(
    val totalReferrals: Int = 0,
    val activeReferrals: Int = 0,
    val totalEarnings: Double = 0.0,
    val pendingEarnings: Double = 0.0,
    val paidEarnings: Double = 0.0,
    val thisMonthEarnings: Double = 0.0,
    val conversionRate: Double = 0.0
)

data class PartnerReferral(
    val id: String,
    val businessName: String,
    val status: String,
    val createdAt: String,
    val planName: String? = null,
    val commissionAmount: Double = 0.0,
    val commissionStatus: String = "PENDING"
)

data class PartnerPayoutHistory(
    val id: String,
    val amount: Double,
    val status: String,
    val paidAt: String? = null,
    val month: String
)

data class PartnerTierInfo(
    val tier: String,
    val minReferrals: Int,
    val commissionRate: Double,
    val perks: List<String>
)

data class PartnerRegisterRequest(
    val name: String,
    val email: String,
    val phone: String,
    val password: String,
    val referralCode: String? = null
)

// ─── API ─────────────────────────────────────────────────────────────────────

interface PartnerApi {

    @POST("api/partner/auth/login")
    suspend fun login(@Body request: PartnerLoginRequest): PartnerLoginResponse

    @POST("api/partner/auth/register")
    suspend fun register(@Body request: PartnerRegisterRequest): PartnerLoginResponse

    @GET("api/partners/dashboard/stats")
    suspend fun getDashboardStats(): PartnerDashboardStats

    @GET("api/partners/referrals")
    suspend fun getReferrals(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): List<PartnerReferral>

    @GET("api/partners/payouts")
    suspend fun getPayoutHistory(): List<PartnerPayoutHistory>

    @GET("api/partners/profile")
    suspend fun getProfile(): PartnerProfile

    @GET("api/partners/tiers")
    suspend fun getTierInfo(): List<PartnerTierInfo>
}
