package com.aiyal.mobibix.ui.features.login

import android.content.Intent
import androidx.lifecycle.ViewModel
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.common.api.ApiException
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class GoogleSignInViewModel @Inject constructor(
    val googleSignInClient: GoogleSignInClient
) : ViewModel() {

    fun getSignInIntent(): Intent = googleSignInClient.signInIntent

    fun onSignInResult(data: Intent?, onSuccess: (String) -> Unit, onError: (String) -> Unit) {
        val task = GoogleSignIn.getSignedInAccountFromIntent(data)
        try {
            val account = task.getResult(ApiException::class.java)
            val idToken = account.idToken
            if (idToken != null) {
                onSuccess(idToken)
            } else {
                onError("Google sign-in failed: ID token not found.")
            }
        } catch (e: ApiException) {
            onError("Google sign-in failed: ${e.localizedMessage}")
        }
    }
}
