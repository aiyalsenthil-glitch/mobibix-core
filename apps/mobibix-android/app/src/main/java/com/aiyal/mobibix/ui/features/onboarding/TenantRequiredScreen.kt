package com.aiyal.mobibix.ui.features.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.aiyal.mobibix.core.app.AppState
import com.aiyal.mobibix.data.network.CreateTenantRequest
import dagger.hilt.android.EntryPointAccessors
import kotlinx.coroutines.launch

@Composable
fun TenantRequiredScreen(
    navController: NavController
) {
    val context = LocalContext.current
    val entryPoint = EntryPointAccessors.fromApplication(
        context,
        OnboardingEntryPoint::class.java
    )

    val tenantApi = entryPoint.tenantApi()
    val tokenStore = entryPoint.tokenStore()
    val appStateResolver = entryPoint.appStateResolver()

    val scope = rememberCoroutineScope()

    var businessName by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {

        Text(
            text = "Create Your Business",
            style = MaterialTheme.typography.headlineLarge,
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(8.dp))

        Text(
            text = "Let's get your business set up.",
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(48.dp))

        OutlinedTextField(
            value = businessName,
            onValueChange = { businessName = it },
            label = { Text("Business Name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(24.dp))

        if (error != null) {
            Text(
                text = error!!,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(bottom = 8.dp)
            )
        }

        Button(
            onClick = {
                if (loading) return@Button
                loading = true
                error = null

                scope.launch {
                    try {
                        val response = tenantApi.createTenant(
                            CreateTenantRequest(name = businessName)
                        )

                        tokenStore.saveToken(response.accessToken)

                        val state = appStateResolver.resolve()
                        navController.navigate(state.toRoute()) {
                            popUpTo("tenant_required") { inclusive = true }
                        }

                    } catch (e: Exception) {
                        error = e.message ?: "Tenant creation failed"
                    } finally {
                        loading = false
                    }
                }
            },
            enabled = !loading && businessName.isNotBlank(),
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            Text(if (loading) "Creating..." else "Create Business")
        }
    }
}
