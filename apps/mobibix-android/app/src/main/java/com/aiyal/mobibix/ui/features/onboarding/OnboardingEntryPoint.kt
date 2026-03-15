package com.aiyal.mobibix.ui.features.onboarding

import com.aiyal.mobibix.core.app.AppStateResolver
import com.aiyal.mobibix.core.auth.TokenStore
import com.aiyal.mobibix.data.network.TenantApi
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@EntryPoint
@InstallIn(SingletonComponent::class)
interface OnboardingEntryPoint {
    fun tenantApi(): TenantApi
    fun tokenStore(): TokenStore
    fun appStateResolver(): AppStateResolver
}
