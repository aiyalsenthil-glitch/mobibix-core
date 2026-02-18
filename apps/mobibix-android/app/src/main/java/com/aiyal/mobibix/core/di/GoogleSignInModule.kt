package com.aiyal.mobibix.core.di

import android.content.Context
import com.aiyal.mobibix.R
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
object GoogleSignInModule {

    @Provides
    fun provideCredentialManager(@ApplicationContext context: Context): androidx.credentials.CredentialManager {
        return androidx.credentials.CredentialManager.create(context)
    }
}
