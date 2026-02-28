package com.aiyal.mobibix.ui.features.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
    val scrollState = rememberScrollState()

    // Identity Fields
    var businessName by remember { mutableStateOf("") }
    var legalName by remember { mutableStateOf("") }
    
    // Category Fields
    var categories by remember { mutableStateOf<List<BusinessCategory>>(emptyList()) }
    var selectedCategory by remember { mutableStateOf<BusinessCategory?>(null) }
    var isExpanded by remember { mutableStateOf(false) }

    // Location & Regional Fields
    var contactPhone by remember { mutableStateOf("") }
    var addressLine1 by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var state by remember { mutableStateOf("") }
    var pincode by remember { mutableStateOf("") }
    var gstNumber by remember { mutableStateOf("") }

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
            .padding(horizontal = 24.dp)
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(48.dp))

        Text(
            text = "Set up your business",
            style = MaterialTheme.typography.headlineMedium,
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(8.dp))

        Text(
            text = "We need some basic details to generate invoices correctly.",
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(32.dp))

        // --- IDENTITY ---
        Text("Identity", style = MaterialTheme.typography.titleMedium, modifier = Modifier.align(Alignment.Start))
        Spacer(Modifier.height(8.dp))

        OutlinedTextField(
            value = businessName,
            onValueChange = { businessName = it },
            label = { Text("Display Name *") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = legalName,
            onValueChange = { legalName = it },
            label = { Text("Legal Entity Name") },
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

        Spacer(Modifier.height(32.dp))

        // --- LOCATION & TAX ---
        Text("Location & Tax", style = MaterialTheme.typography.titleMedium, modifier = Modifier.align(Alignment.Start))
        Spacer(Modifier.height(8.dp))

        OutlinedTextField(
            value = contactPhone,
            onValueChange = { contactPhone = it },
            label = { Text("Contact Phone *") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = addressLine1,
            onValueChange = { addressLine1 = it },
            label = { Text("Address") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = city,
            onValueChange = { city = it },
            label = { Text("City *") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = state,
            onValueChange = { state = it },
            label = { Text("State *") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = pincode,
            onValueChange = { pincode = it },
            label = { Text("Pincode") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = gstNumber,
            onValueChange = { gstNumber = it },
            label = { Text("GST / Tax Registration") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(32.dp))

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
                if (businessName.isBlank() || contactPhone.isBlank() || city.isBlank() || state.isBlank()) {
                    error = "Please fill in all required (*) fields"
                    return@Button
                }

                loading = true
                error = null

                scope.launch {
                    try {
                        val response = tenantApi.createTenant(
                            CreateTenantRequest(
                                name = businessName.trim(),
                                businessType = selectedCategory!!.name,
                                businessCategoryId = selectedCategory!!.id,
                                legalName = legalName.trim().takeIf { it.isNotEmpty() },
                                contactPhone = contactPhone.trim(),
                                addressLine1 = addressLine1.trim().takeIf { it.isNotEmpty() },
                                city = city.trim(),
                                state = state.trim(),
                                pincode = pincode.trim().takeIf { it.isNotEmpty() },
                                gstNumber = gstNumber.trim().takeIf { it.isNotEmpty() },
                                currency = "INR",
                                timezone = "Asia/Kolkata"
                            )
                        )

                        tokenStore.saveToken(response.accessToken)

                        val tenantState = appStateResolver.resolve()
                        navController.navigate(tenantState.toRoute()) {
                            popUpTo("tenant_required") { inclusive = true }
                        }

                    } catch (e: Exception) {
                        error = e.message ?: "Tenant creation failed"
                    } finally {
                        loading = false
                    }
                }
            },
            enabled = !loading && !isComingSoon,
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            Text(if (loading) "Creating..." else "Create Business")
        }
        
        Spacer(Modifier.height(48.dp))
    }
}
