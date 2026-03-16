package com.aiyal.mobibix.core.auth

import com.aiyal.mobibix.core.app.AppStateResolver
import com.aiyal.mobibix.core.ui.UiMessageBus
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@EntryPoint
@InstallIn(SingletonComponent::class)
interface AuthEntryPoint {
    fun authRepository(): AuthRepository
    fun appStateResolver(): AppStateResolver
    fun authEventBus(): AuthEventBus
    fun uiMessageBus(): UiMessageBus
}
