package com.aiyal.mobibix.ui.features.login

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import com.aiyal.mobibix.R
import kotlinx.coroutines.delay

import com.aiyal.mobibix.ui.components.AuroraBackground

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
        delay(100)
        isVisible = true
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AuroraBackground()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Header Section
            AnimatedVisibility(
                visible = isVisible,
                enter = fadeIn(tween(800)) + slideInVertically(tween(800)) { -40 }
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(Color(0xFF10B981), CircleShape)
                        )
                        Spacer(Modifier.width(10.dp))
                        Text(
                            "MOBIBIX",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 4.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    Text(
                        text = when (uiState.step) {
                            AuthStep.SIGNUP_PASS -> "Create Account"
                            AuthStep.VERIFY -> "Verify Email"
                            else -> "Welcome Back"
                        },
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            Spacer(Modifier.height(32.dp))

            // Glassmorphism Card
            AnimatedVisibility(
                visible = isVisible,
                enter = fadeIn(tween(1000, 200)) + slideInVertically(tween(1000, 200)) { 40 }
            ) {
                // Get responsive isLight value to drive some alpha/color tweaks inside the glass panel
                val isLight = MaterialTheme.colorScheme.background.red > 0.5f
                val glassPanelColor = if (isLight) Color.White.copy(alpha = 0.4f) else Color.White.copy(alpha = 0.05f)
                val glassBorderStart = if (isLight) Color.White.copy(alpha = 0.6f) else Color.White.copy(alpha = 0.1f)
                val glassBorderEnd = if (isLight) Color.White.copy(alpha = 0.2f) else Color.Transparent

                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(
                            1.dp,
                            Brush.verticalGradient(
                                colors = listOf(glassBorderStart, glassBorderEnd)
                            ),
                            RoundedCornerShape(32.dp)
                        ),
                    color = glassPanelColor,
                    shape = RoundedCornerShape(32.dp),
                ) {
                    Column(
                        modifier = Modifier.padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        if (uiState.errorMessage != null) {
                            Surface(
                                color = if (uiState.errorMessage.contains("sent", true)) 
                                    Color(0xFF10B981).copy(alpha = 0.1f) 
                                    else Color(0xFFEF4444).copy(alpha = 0.1f),
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.fillMaxWidth().padding(bottom = 20.dp)
                            ) {
                                Text(
                                    text = uiState.errorMessage,
                                    color = if (uiState.errorMessage.contains("sent", true)) 
                                        Color(0xFF34D399) else Color(0xFFF87171),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(12.dp),
                                    textAlign = TextAlign.Center
                                )
                            }
                        }

                        when (uiState.step) {
                            AuthStep.LANDING -> {
                                OutlinedButton(
                                    onClick = onGoogleLogin,
                                    enabled = !uiState.isLoading,
                                    modifier = Modifier.fillMaxWidth().height(56.dp),
                                    shape = RoundedCornerShape(20.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurface),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(painter = painterResource(id = R.drawable.ic_google_logo), "Google", modifier = Modifier.size(20.dp), tint = Color.Unspecified)
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Text("Continue with Google", fontWeight = FontWeight.Bold)
                                    }
                                }

                                Spacer(modifier = Modifier.height(24.dp))
                                
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    HorizontalDivider(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
                                    Text(" OR ", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(horizontal = 8.dp))
                                    HorizontalDivider(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
                                }

                                Spacer(modifier = Modifier.height(24.dp))

                                OutlinedTextField(
                                    value = email,
                                    onValueChange = { email = it },
                                    placeholder = { Text("Email Address", color = MaterialTheme.colorScheme.onSurfaceVariant) },
                                    enabled = !uiState.isLoading,
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                                        focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                        unfocusedBorderColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f),
                                        focusedBorderColor = Color(0xFF14B8A6),
                                        unfocusedContainerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                                        focusedContainerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
                                    )
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                                Button(
                                    onClick = { onEmailContinue(email) },
                                    enabled = !uiState.isLoading && email.contains("@"),
                                    modifier = Modifier.fillMaxWidth().height(56.dp),
                                    shape = RoundedCornerShape(20.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF14B8A6))
                                ) {
                                    Text("Continue", fontWeight = FontWeight.Bold)
                                }
                            }

                            AuthStep.LOGIN_PASS -> {
                                Text(email, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                                Spacer(modifier = Modifier.height(20.dp))
                                
                                OutlinedTextField(
                                    value = password,
                                    onValueChange = { password = it },
                                    placeholder = { Text("Password", color = MaterialTheme.colorScheme.onSurfaceVariant) },
                                    enabled = !uiState.isLoading,
                                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                                        focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                        unfocusedBorderColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f),
                                        focusedBorderColor = Color(0xFF14B8A6),
                                        unfocusedContainerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                                        focusedContainerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
                                    ),
                                    trailingIcon = {
                                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                            Icon(if (passwordVisible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                )
                                Spacer(modifier = Modifier.height(24.dp))
                                Button(
                                    onClick = { onLogin(password) },
                                    enabled = !uiState.isLoading && password.isNotEmpty(),
                                    modifier = Modifier.fillMaxWidth().height(56.dp),
                                    shape = RoundedCornerShape(20.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF14B8A6))
                                ) {
                                    if (uiState.isLoading) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
                                    else Text("Sign In", fontWeight = FontWeight.Bold)
                                }
                                TextButton(onClick = onBack) { Text("Change Email", color = Color(0xFF14B8A6)) }
                            }

                            AuthStep.SIGNUP_PASS -> {
                                Text(email, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
                                Spacer(modifier = Modifier.height(20.dp))

                                OutlinedTextField(
                                    value = fullName,
                                    onValueChange = { fullName = it },
                                    placeholder = { Text("Full Name", color = MaterialTheme.colorScheme.onSurfaceVariant) },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                                        focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                        unfocusedBorderColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f),
                                        focusedBorderColor = Color(0xFF14B8A6),
                                        unfocusedContainerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                                        focusedContainerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
                                    )
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                OutlinedTextField(
                                    value = password,
                                    onValueChange = { password = it },
                                    placeholder = { Text("Password", color = MaterialTheme.colorScheme.onSurfaceVariant) },
                                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                                        focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                        unfocusedBorderColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f),
                                        focusedBorderColor = Color(0xFF14B8A6),
                                        unfocusedContainerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f),
                                        focusedContainerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
                                    ),
                                    trailingIcon = {
                                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                            Icon(if (passwordVisible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                )
                                Spacer(modifier = Modifier.height(24.dp))
                                Button(
                                    onClick = { onSignup(password, fullName) },
                                    enabled = !uiState.isLoading && password.length >= 6 && fullName.isNotBlank(),
                                    modifier = Modifier.fillMaxWidth().height(56.dp),
                                    shape = RoundedCornerShape(20.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF14B8A6))
                                ) {
                                    if (uiState.isLoading) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
                                    else Text("Create Account", fontWeight = FontWeight.Bold)
                                }
                                TextButton(onClick = onBack) { Text("Change Email", color = Color(0xFF14B8A6)) }
                            }

                            AuthStep.VERIFY -> {
                                Box(
                                    modifier = Modifier
                                        .size(64.dp)
                                        .background(Color(0xFF14B8A6).copy(alpha = 0.1f), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Outlined.Email, null, modifier = Modifier.size(32.dp), tint = Color(0xFF14B8A6))
                                }
                                Spacer(modifier = Modifier.height(24.dp))
                                Text(
                                    "Check your inbox. We sent a verification link to:",
                                    textAlign = TextAlign.Center,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(email, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                                Spacer(modifier = Modifier.height(32.dp))
                                
                                Button(
                                    onClick = onCheckVerification,
                                    enabled = !uiState.isLoading,
                                    modifier = Modifier.fillMaxWidth().height(56.dp),
                                    shape = RoundedCornerShape(20.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF14B8A6))
                                ) {
                                    if (uiState.isLoading) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
                                    else Text("I've Verified", fontWeight = FontWeight.Bold)
                                }
                                
                                TextButton(onClick = onResendVerification) {
                                    Text("Resend Email", color = Color(0xFF14B8A6))
                                }
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(48.dp))
            Text(
                "Secure Access • MobiBix OS",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
