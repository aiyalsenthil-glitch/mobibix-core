package com.aiyal.mobibix.core.app

object UserRole {
    const val OWNER = "OWNER"
    const val ADMIN = "ADMIN"
    const val MANAGER = "MANAGER"
    const val STAFF = "STAFF"
    const val TECHNICIAN = "TECHNICIAN"
    const val ACCOUNTANT = "ACCOUNTANT"
    const val SUPERVISOR = "SUPERVISOR"
}

sealed class AppState {
    object TenantRequired : AppState()
    object ComingSoonBusiness : AppState()
    data class Error(val message: String) : AppState()

    data class Owner(
        val role: String,
        val isSystemOwner: Boolean,
        val permissions: List<String>,
        val isDistributor: Boolean = false,
        val hasActiveERP: Boolean = true
    ) : AppState()

    data class Staff(
        val shopId: String,
        val role: String,
        val isSystemOwner: Boolean = false,
        val permissions: List<String>,
        val isDistributor: Boolean = false,
        val hasActiveERP: Boolean = true
    ) : AppState()

    /** Pure distributor — no ERP tenant, just the wholesale/referral network */
    data class Distributor(
        val userId: String,
        val email: String,
        val name: String?,
        val hasActiveERP: Boolean = false    // false until they upgrade
    ) : AppState()

    fun toRoute(): String = when (this) {
        is TenantRequired -> "tenant_required"
        is ComingSoonBusiness -> "coming_soon_business"
        is Owner -> "owner_dashboard"
        is Staff -> "staff_dashboard/$shopId"
        is Distributor -> "distributor_dashboard"
        is Error -> "home"
    }

    fun hasPermission(action: String): Boolean = when (this) {
        is Owner -> isSystemOwner || permissions.contains(action)
        is Staff -> isSystemOwner || permissions.contains(action)
        else -> false
    }

    val isDistributorUser: Boolean get() = when (this) {
        is Owner -> isDistributor
        is Staff -> isDistributor
        is Distributor -> true
        else -> false
    }
}
