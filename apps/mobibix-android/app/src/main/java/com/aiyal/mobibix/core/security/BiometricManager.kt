package com.aiyal.mobibix.core.security

import android.content.Context
import androidx.biometric.BiometricManager as AndroidBiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val BIOMETRIC_ENABLED_KEY = booleanPreferencesKey("biometric_lock_enabled")

/**
 * Manages biometric authentication for app lock.
 * Uses BiometricPrompt API (supports fingerprint, face, PIN fallback).
 */
class MobiBiometricManager(
    private val dataStore: DataStore<Preferences>
) {
    val biometricEnabled: Flow<Boolean> = dataStore.data.map { it[BIOMETRIC_ENABLED_KEY] ?: false }

    suspend fun setBiometricEnabled(enabled: Boolean) {
        dataStore.edit { it[BIOMETRIC_ENABLED_KEY] = enabled }
    }

    companion object {
        /**
         * Check if the device supports biometric authentication.
         */
        fun isAvailable(context: Context): Boolean {
            val manager = AndroidBiometricManager.from(context)
            return manager.canAuthenticate(
                AndroidBiometricManager.Authenticators.BIOMETRIC_STRONG or
                        AndroidBiometricManager.Authenticators.DEVICE_CREDENTIAL
            ) == AndroidBiometricManager.BIOMETRIC_SUCCESS
        }

        /**
         * Show the biometric prompt. Call from an Activity context.
         * @param activity FragmentActivity hosting the prompt
         * @param onSuccess Called when authentication succeeds
         * @param onError Called on failure/cancellation with a message
         */
        fun authenticate(
            activity: FragmentActivity,
            title: String = "Unlock MobiBix",
            subtitle: String = "Confirm your identity to continue",
            onSuccess: () -> Unit,
            onError: (String) -> Unit
        ) {
            val executor = ContextCompat.getMainExecutor(activity)
            val callback = object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    onSuccess()
                }
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    if (errorCode != BiometricPrompt.ERROR_NEGATIVE_BUTTON &&
                        errorCode != BiometricPrompt.ERROR_USER_CANCELED
                    ) {
                        onError(errString.toString())
                    } else {
                        onError("Authentication cancelled")
                    }
                }
                override fun onAuthenticationFailed() {
                    // prompt stays open, no action needed
                }
            }

            val prompt = BiometricPrompt(activity, executor, callback)
            val info = BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setAllowedAuthenticators(
                    AndroidBiometricManager.Authenticators.BIOMETRIC_STRONG or
                            AndroidBiometricManager.Authenticators.DEVICE_CREDENTIAL
                )
                .build()

            prompt.authenticate(info)
        }
    }
}
