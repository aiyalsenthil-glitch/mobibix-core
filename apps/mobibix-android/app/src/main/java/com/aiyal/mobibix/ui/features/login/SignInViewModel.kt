package com.aiyal.mobibix.ui.features.login

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.auth.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.io.IOException
import java.net.SocketTimeoutException
import javax.inject.Inject

enum class AuthStep {
    LANDING,
    LOGIN_PASS,
    SIGNUP_PASS,
    VERIFY
}

data class SignInUiState(
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val loginSuccess: Boolean = false,
    val step: AuthStep = AuthStep.LANDING,
    val email: String = "",
    val isVerified: Boolean = false
)

@HiltViewModel
class SignInViewModel @Inject constructor(
    private val authRepo: AuthRepository
) : ViewModel() {

    private val _uiState = mutableStateOf(SignInUiState())
    val uiState: State<SignInUiState> = _uiState

    fun setStep(step: AuthStep) {
        _uiState.value = _uiState.value.copy(step = step, errorMessage = null)
    }

    fun setEmail(email: String) {
        _uiState.value = _uiState.value.copy(email = email)
    }

    fun signIn(password: String) {
        val email = _uiState.value.email
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            runCatching {
                authRepo.signInWithEmail(email, password)
            }.onSuccess {
                _uiState.value = _uiState.value.copy(isLoading = false, loginSuccess = true)
            }.onFailure { e ->
                val errorMessage = when (e) {
                    is SocketTimeoutException, is IOException -> "Could not connect to the server."
                    else -> e.message ?: "Invalid email or password"
                }

                if (errorMessage.contains("no user record", ignoreCase = true) || 
                    errorMessage.contains("no account found", ignoreCase = true)) {
                    _uiState.value = _uiState.value.copy(isLoading = false, step = AuthStep.SIGNUP_PASS)
                } else if (errorMessage.contains("EMAIL_NOT_VERIFIED", ignoreCase = true)) {
                    _uiState.value = _uiState.value.copy(isLoading = false, step = AuthStep.VERIFY)
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = errorMessage)
                }
            }
        }
    }

    fun signUp(password: String, fullName: String) {
        val email = _uiState.value.email
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            runCatching {
                authRepo.signUpWithEmail(email, password, fullName)
            }.onSuccess {
                _uiState.value = _uiState.value.copy(isLoading = false, step = AuthStep.VERIFY)
            }.onFailure {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = it.message ?: "Signup failed")
            }
        }
    }

    fun checkVerification() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            runCatching {
                if (authRepo.checkEmailVerified()) {
                    // Firebase side verified, now exchange token with backend
                    val REMOVED_AUTH_PROVIDERUser = com.google.REMOVED_AUTH_PROVIDER.auth.FirebaseAuth.getInstance().currentUser
                    val tokenResult = REMOVED_AUTH_PROVIDERUser?.getIdToken(true)?.await()
                    val idToken: String? = tokenResult?.token
                    if (idToken != null) {
                        authRepo.loginWithFirebase(idToken)
                        _uiState.value = _uiState.value.copy(isLoading = false, loginSuccess = true)
                    } else {
                        _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = "Auth session expired")
                    }
                } else {
                    _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = "Email not verified yet. Please check your inbox.")
                }
            }.onFailure {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = it.message ?: "Verification check failed")
            }
        }
    }

    fun resendVerification() {
        viewModelScope.launch {
            runCatching {
                authRepo.resendVerificationEmail()
            }.onSuccess {
                _uiState.value = _uiState.value.copy(errorMessage = "Verification email sent!")
            }.onFailure {
                _uiState.value = _uiState.value.copy(errorMessage = "Failed to resend email")
            }
        }
    }

    fun signInWithGoogle(idToken: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            runCatching {
                authRepo.signInWithGoogleToken(idToken)
            }.onSuccess {
                _uiState.value = _uiState.value.copy(isLoading = false, loginSuccess = true)
            }.onFailure {
                val errorMessage = if (it is SocketTimeoutException) {
                    "Server unreachable"
                } else {
                    "Google sign-in failed"
                }
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = errorMessage)
            }
        }
    }
}
