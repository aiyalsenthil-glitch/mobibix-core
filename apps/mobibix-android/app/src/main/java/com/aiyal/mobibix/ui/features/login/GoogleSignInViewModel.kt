package com.aiyal.mobibix.ui.features.login

import android.content.Intent
import androidx.lifecycle.ViewModel
import com.google.android.gms.common.api.ApiException
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class GoogleSignInViewModel @Inject constructor(
    private val credentialManager: androidx.credentials.CredentialManager,
    @dagger.hilt.android.qualifiers.ApplicationContext private val context: android.content.Context
) : ViewModel() {

    suspend fun signIn(
        activityContext: android.content.Context,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        val googleIdOption = com.google.android.libraries.identity.googleid.GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(context.getString(com.aiyal.mobibix.R.string.default_web_client_id))
            .setAutoSelectEnabled(true)
            .build()

        val request = androidx.credentials.GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        try {
            val result = credentialManager.getCredential(
                request = request,
                context = activityContext,
            )
            handleSignIn(result, onSuccess, onError)
        } catch (e: androidx.credentials.exceptions.GetCredentialException) {
            onError(e.message ?: "SignIn failed")
        }
    }

    private fun handleSignIn(
        result: androidx.credentials.GetCredentialResponse,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        val credential = result.credential
        if (credential is androidx.credentials.CustomCredential &&
            credential.type == com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            
            try {
                val googleIdTokenCredential = com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.createFrom(credential.data)
                onSuccess(googleIdTokenCredential.idToken)
            } catch (e: com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException) {
                onError("Received an invalid google id token response")
            }
        } else {
            onError("Unexpected credential type")
        }
    }
}
