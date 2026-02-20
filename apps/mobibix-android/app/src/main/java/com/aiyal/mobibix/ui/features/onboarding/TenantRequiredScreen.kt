package com.aiyal.mobibix.ui.features.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.aiyal.mobibix.data.network.BusinessCategory
import com.aiyal.mobibix.data.network.CreateTenantRequest
import dagger.hilt.android.EntryPointAccessors
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
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
    var categories by remember { mutableStateOf<List<BusinessCategory>>(emptyList()) }
    var selectedCategory by remember { mutableStateOf<BusinessCategory?>(null) }
    var isExpanded by remember { mutableStateOf(false) }

    var loading by remember { mutableStateOf(false) }
    var categoriesLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            categories = tenantApi.getBusinessCategories()
            if (categories.isNotEmpty()) {
                selectedCategory = categories.firstOrNull { it.name == "Mobile Shop" } ?: categories.firstOrNull()
            }
        } catch (e: Exception) {
            error = "Failed to load business categories: ${e.message}"
        } finally {
            categoriesLoading = false
        }
    }

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

        Spacer(Modifier.height(16.dp))

        if (categoriesLoading) {
            Text("Loading categories...", style = MaterialTheme.typography.bodySmall)
        } else {
            ExposedDropdownMenuBox(
                expanded = isExpanded,
                onExpandedChange = { isExpanded = it },
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedTextField(
                    value = selectedCategory?.name ?: "Select Category",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Business Type") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = isExpanded) },
                    colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
                    modifier = Modifier.menuAnchor().fillMaxWidth()
                )

                ExposedDropdownMenu(
                    expanded = isExpanded,
                    onDismissRequest = { isExpanded = false }
                ) {
                    categories.forEach { category ->
                        DropdownMenuItem(
                            text = { Text(category.name) },
                            onClick = {
                                selectedCategory = category
                                isExpanded = false
                            }
                        )
                    }
                }
            }
        }

        val isComingSoon = selectedCategory?.isComingSoon == true || selectedCategory?.name != "Mobile Shop"

        if (selectedCategory != null && isComingSoon) {
            Spacer(Modifier.height(8.dp))
            Text(
                text = "Coming soon! Only Mobile Shops are supported during this phase.",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center
            )
        }

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
                if (loading || selectedCategory == null || isComingSoon) return@Button
                loading = true
                error = null

                scope.launch {
                    try {
                        val response = tenantApi.createTenant(
                            CreateTenantRequest(
                                name = businessName,
                                businessType = selectedCategory!!.name,
                                businessCategoryId = selectedCategory!!.id
                            )
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
            enabled = !loading && businessName.isNotBlank() && selectedCategory != null && !isComingSoon,
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            Text(if (loading) "Creating..." else "Create Business")
        }
    }
}
