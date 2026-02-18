package com.aiyal.mobibix.core.app

sealed class AppState {
    object TenantRequired : AppState()
    object Owner : AppState()
    data class Staff(val shopId: String) : AppState()

    fun toRoute(): String {
        return when (this) {
            is TenantRequired -> "tenant_required"
            is Owner -> "owner_dashboard"
            is Staff -> "staff_dashboard/$shopId"
        }
    }
}
