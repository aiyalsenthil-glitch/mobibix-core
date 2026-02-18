package com.aiyal.mobibix.ui.features.login

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiyal.mobibix.R
import kotlinx.coroutines.delay

@Composable
fun AuthScreen(
    uiState: SignInUiState,
    onEmailContinue: (email: String) -> Unit,
    onLogin: (password: String) -> Unit,
    onSignup: (password: String, fullName: String) -> Unit,
    onCheckVerification: () -> Unit,
    onResendVerification: () -> Unit,
    onGoogleLogin: () -> Unit,
    onBack: () -> Unit
) {
    var email by remember { mutableStateOf(uiState.email) }
    var password by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    var isVisible by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay(150)
        isVisible = true
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(colors = listOf(Color(0xFF14B8A6), Color(0xFF5EEAD4)))
                    )
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("MobiBix", fontSize = 34.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text("Business, Simplified.", color = Color.White.copy(alpha = 0.9f), fontSize = 14.sp)
            }
        }

        AnimatedVisibility(
            visible = isVisible,
            enter = slideInVertically(initialOffsetY = { it / 2 }) + fadeIn(animationSpec = tween(durationMillis = 250)),
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 10.dp),
                shape = RoundedCornerShape(24.dp),
                elevation = CardDefaults.cardElevation(8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    val title = when (uiState.step) {
                        AuthStep.LANDING -> "Welcome to MobiBix"
                        AuthStep.LOGIN_PASS -> "Sign In"
                        AuthStep.SIGNUP_PASS -> "Create Account"
                        AuthStep.VERIFY -> "Verify Email"
                    }
                    
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        fontSize = 22.sp
                    )
                    Spacer(modifier = Modifier.height(20.dp))

                    if (uiState.errorMessage != null) {
                        Text(
                            text = uiState.errorMessage,
                            color = if (uiState.errorMessage.contains("sent", true)) Color(0xFF10B981) else MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
                        )
                    }

                    when (uiState.step) {
                        AuthStep.LANDING -> {
                            OutlinedTextField(
                                value = email,
                                onValueChange = { email = it },
                                label = { Text("Email") },
                                enabled = !uiState.isLoading,
                                modifier = Modifier.fillMaxWidth(),
                                leadingIcon = { Icon(Icons.Outlined.Email, "Email") }
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            Button(
                                onClick = { onEmailContinue(email) },
                                enabled = !uiState.isLoading && email.contains("@"),
                                modifier = Modifier.fillMaxWidth().height(56.dp),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Text("Continue")
                            }
                            
                            Spacer(modifier = Modifier.height(18.dp))
                            HorizontalDivider()
                            Spacer(modifier = Modifier.height(18.dp))

                            OutlinedButton(
                                onClick = onGoogleLogin,
                                enabled = !uiState.isLoading,
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(painter = painterResource(id = R.drawable.ic_google_logo), "Google", modifier = Modifier.size(24.dp), tint = Color.Unspecified)
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text("Continue with Google")
                                }
                            }
                        }

                        AuthStep.LOGIN_PASS -> {
                            Text(email, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            OutlinedTextField(
                                value = password,
                                onValueChange = { password = it },
                                label = { Text("Password") },
                                enabled = !uiState.isLoading,
                                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                modifier = Modifier.fillMaxWidth(),
                                leadingIcon = { Icon(Icons.Outlined.Lock, "Password") },
                                trailingIcon = {
                                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                        Icon(if (passwordVisible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, "Toggle Visibility")
                                    }
                                }
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            Button(
                                onClick = { onLogin(password) },
                                enabled = !uiState.isLoading && password.isNotEmpty(),
                                modifier = Modifier.fillMaxWidth().height(56.dp),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                if (uiState.isLoading) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                                else Text("Sign In")
                            }
                            TextButton(onClick = onBack) { Text("Change Email") }
                        }

                        AuthStep.SIGNUP_PASS -> {
                            Text(email, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(16.dp))

                            OutlinedTextField(
                                value = fullName,
                                onValueChange = { fullName = it },
                                label = { Text("Full Name") },
                                enabled = !uiState.isLoading,
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            OutlinedTextField(
                                value = password,
                                onValueChange = { password = it },
                                label = { Text("Create Password (min 6 chars)") },
                                enabled = !uiState.isLoading,
                                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                modifier = Modifier.fillMaxWidth(),
                                trailingIcon = {
                                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                        Icon(if (passwordVisible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, "Toggle Visibility")
                                    }
                                }
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            Button(
                                onClick = { onSignup(password, fullName) },
                                enabled = !uiState.isLoading && password.length >= 6 && fullName.isNotBlank(),
                                modifier = Modifier.fillMaxWidth().height(56.dp),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                if (uiState.isLoading) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                                else Text("Create Account")
                            }
                            TextButton(onClick = onBack) { Text("Change Email") }
                        }

                        AuthStep.VERIFY -> {
                            Icon(Icons.Outlined.Email, null, modifier = Modifier.size(64.dp), tint = Color(0xFF14B8A6))
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                "Check your inbox. We sent a verification link to:",
                                textAlign = TextAlign.Center,
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Text(email, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(24.dp))
                            
                            Button(
                                onClick = onCheckVerification,
                                enabled = !uiState.isLoading,
                                modifier = Modifier.fillMaxWidth().height(56.dp),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                if (uiState.isLoading) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                                else Text("I've Verified My Email")
                            }
                            
                            TextButton(onClick = onResendVerification, enabled = !uiState.isLoading) {
                                Text("Resend Verification Email")
                            }
                            TextButton(onClick = onBack) { Text("Change Email") }
                        }
                    }
                }
            }
        }
    }
}
