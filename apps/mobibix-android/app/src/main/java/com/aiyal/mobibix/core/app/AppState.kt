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
    data class Owner(
        val role: String,
        val isSystemOwner: Boolean,
        val permissions: List<String>
    ) : AppState()
    
    data class Staff(
        val shopId: String,
        val role: String,
        val isSystemOwner: Boolean = false,
        val permissions: List<String>
    ) : AppState()

    fun toRoute(): String {
        return when (this) {
            is TenantRequired -> "tenant_required"
            is ComingSoonBusiness -> "coming_soon_business"
            is Owner -> "owner_dashboard"
            is Staff -> "staff_dashboard/$shopId"
        }
    }

    fun hasPermission(action: String): Boolean {
        return when (this) {
            is Owner -> isSystemOwner || permissions.contains(action)
            is Staff -> isSystemOwner || permissions.contains(action)
            else -> false
        }
    }
}
