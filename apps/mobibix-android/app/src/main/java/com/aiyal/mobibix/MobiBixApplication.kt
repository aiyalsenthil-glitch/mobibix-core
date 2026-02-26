package com.aiyal.mobibix

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

import com.google.REMOVED_AUTH_PROVIDER.crashlytics.FirebaseCrashlytics

@HiltAndroidApp
class MobiBixApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseCrashlytics.getInstance().setCrashlyticsCollectionEnabled(!BuildConfig.DEBUG)
    }
}
