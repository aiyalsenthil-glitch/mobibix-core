package com.aiyal.mobibix.core.auth

import com.aiyal.mobibix.data.network.AuthService
import com.aiyal.mobibix.data.network.dto.ExchangeTokenRequest
import com.google.REMOVED_AUTH_PROVIDER.auth.FirebaseAuth
import com.google.REMOVED_AUTH_PROVIDER.auth.GoogleAuthProvider
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val authService: AuthService,
    private val tokenStore: TokenStore,
    private val shopContextStore: com.aiyal.mobibix.core.shop.ShopContextStore
) {

    suspend fun signInWithEmail(email: String, password: String) {
        val result = FirebaseAuth.getInstance().signInWithEmailAndPassword(email, password).await()
        val REMOVED_AUTH_PROVIDERUser = result.user ?: throw IllegalStateException("Firebase user not found")
        val idToken = REMOVED_AUTH_PROVIDERUser.getIdToken(true).await().token ?: throw IllegalStateException("Firebase ID token not found")
        loginWithFirebase(idToken)
    }

    suspend fun signInWithGoogleToken(googleIdToken: String) {
        val credential = GoogleAuthProvider.getCredential(googleIdToken, null)
        val result = FirebaseAuth.getInstance().signInWithCredential(credential).await()
        val REMOVED_AUTH_PROVIDERUser = result.user ?: throw IllegalStateException("Firebase user not found")
        val idToken = REMOVED_AUTH_PROVIDERUser.getIdToken(true).await().token ?: throw IllegalStateException("Firebase ID token not found")
        loginWithFirebase(idToken)
    }

    suspend fun signUpWithEmail(email: String, password: String, fullName: String) {
        val result = FirebaseAuth.getInstance().createUserWithEmailAndPassword(email, password).await()
        val REMOVED_AUTH_PROVIDERUser = result.user ?: throw IllegalStateException("Firebase user not found")
        
        // Update display name
        val profileUpdates = com.google.REMOVED_AUTH_PROVIDER.auth.userProfileChangeRequest {
            displayName = fullName
        }
        REMOVED_AUTH_PROVIDERUser.updateProfile(profileUpdates).await()
        
        // Send verification email
        REMOVED_AUTH_PROVIDERUser.sendEmailVerification().await()
    }

    suspend fun checkEmailVerified(): Boolean {
        val user = FirebaseAuth.getInstance().currentUser ?: return false
        user.reload().await()
        return user.isEmailVerified
    }

    suspend fun resendVerificationEmail() {
        val user = FirebaseAuth.getInstance().currentUser ?: throw IllegalStateException("No user logged in")
        user.sendEmailVerification().await()
    }

    suspend fun loginWithFirebase(
        REMOVED_AUTH_PROVIDERIdToken: String,
        tenantCode: String? = null
    ) {
        val response = authService.exchangeToken(
            ExchangeTokenRequest(
                idToken = REMOVED_AUTH_PROVIDERIdToken
            )
        )
        // Retrofit Response<T> handling
        if (response.isSuccessful && response.body() != null) {
            tokenStore.saveToken(response.body()!!.accessToken)
        } else {
            throw Exception("Login failed: ${response.code()}")
        }
    }

    suspend fun logout() {
        FirebaseAuth.getInstance().signOut()
        tokenStore.clear()
        shopContextStore.clear()
    }
}
