package com.aiyal.mobibix.ui.features.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
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
import com.aiyal.mobibix.data.network.CountryOption
import com.aiyal.mobibix.data.network.CreateTenantRequest
import dagger.hilt.android.EntryPointAccessors
import kotlinx.coroutines.launch

// Default fallback list mirrors /api/config/countries response
private val DEFAULT_COUNTRIES = listOf(
    CountryOption("IN",  "India",                 "INR", "₹",   "+91",  "GST",  "Asia/Kolkata",      true),
    CountryOption("AE",  "United Arab Emirates",  "AED", "د.إ", "+971", "VAT",  "Asia/Dubai",        false),
    CountryOption("SG",  "Singapore",             "SGD", "S\$",  "+65",  "GST",  "Asia/Singapore",    false),
    CountryOption("MY",  "Malaysia",              "MYR", "RM",  "+60",  "SST",  "Asia/Kuala_Lumpur", false),
    CountryOption("CA",  "Canada",                "CAD", "C\$",  "+1",   "NONE", "America/Toronto",   false),
    CountryOption("GB",  "United Kingdom",        "GBP", "£",   "+44",  "VAT",  "Europe/London",     false),
    CountryOption("US",  "United States",         "USD", "\$",   "+1",   "NONE", "America/New_York",  false),
    CountryOption("AU",  "Australia",             "AUD", "A\$",  "+61",  "GST",  "Australia/Sydney",  false),
)

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
    var promoCode by remember { mutableStateOf("") }
    
    // Category Fields
    var categories by remember { mutableStateOf<List<BusinessCategory>>(emptyList()) }
    var selectedCategory by remember { mutableStateOf<BusinessCategory?>(null) }
    var isExpanded by remember { mutableStateOf(false) }

    // Country selection — loaded from /api/config/countries with static fallback
    var countries by remember { mutableStateOf(DEFAULT_COUNTRIES) }
    var selectedCountry by remember { mutableStateOf(DEFAULT_COUNTRIES.first()) }
    var currency by remember { mutableStateOf(DEFAULT_COUNTRIES.first().currency) }
    var timezone by remember { mutableStateOf(DEFAULT_COUNTRIES.first().timezone) }
    var isCountryExpanded by remember { mutableStateOf(false) }

    // Location & Regional Fields
    var contactPhone by remember { mutableStateOf("") }
    var addressLine1 by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var state by remember { mutableStateOf("") }
    var pincode by remember { mutableStateOf("") }
    var gstNumber by remember { mutableStateOf("") }

    var agreedToTerms by remember { mutableStateOf(false) }
    var marketingConsent by remember { mutableStateOf(false) }

    var loading by remember { mutableStateOf(false) }
    var categoriesLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        // Load business categories
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

        // Load dynamic country list from /api/config/countries (fail-safe)
        try {
            val fetched = tenantApi.getCountries()
            if (fetched.isNotEmpty()) {
                countries = fetched
                // Re-apply defaults from the loaded list
                val india = fetched.firstOrNull { it.code == "IN" } ?: fetched.first()
                selectedCountry = india
                currency = india.currency
                timezone = india.timezone
            }
        } catch (e: Exception) {
            // Silent fallback — DEFAULT_COUNTRIES is already set
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

        OutlinedTextField(
            value = promoCode,
            onValueChange = { promoCode = it.uppercase() },
            label = { Text("Promo Code (Optional)") },
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

        // Country Selector (dynamic list from API)
        ExposedDropdownMenuBox(
            expanded = isCountryExpanded,
            onExpandedChange = { isCountryExpanded = it },
            modifier = Modifier.fillMaxWidth()
        ) {
            OutlinedTextField(
                value = selectedCountry.name,
                onValueChange = {},
                readOnly = true,
                label = { Text("Country *") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = isCountryExpanded) },
                colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
                modifier = Modifier.menuAnchor().fillMaxWidth()
            )

            ExposedDropdownMenu(
                expanded = isCountryExpanded,
                onDismissRequest = { isCountryExpanded = false }
            ) {
                countries.forEach { country ->
                    DropdownMenuItem(
                        text = { Text("${country.name}  ${country.currencySymbol} ${country.currency}") },
                        onClick = {
                            selectedCountry = country
                            currency = country.currency
                            timezone = country.timezone
                            // Clear GST when switching away from India
                            if (!country.hasGstField) gstNumber = ""
                            isCountryExpanded = false
                        }
                    )
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = contactPhone,
            onValueChange = { input ->
                val cleaned = input.filter { it.isDigit() }
                contactPhone = if (selectedCountry.code == "IN") {
                    if (cleaned.startsWith("0")) cleaned.drop(1).take(10) else cleaned.take(10)
                } else {
                    cleaned.take(15)
                }
            },
            label = { Text("Contact Phone *") },
            prefix = {
                Text(text = "${selectedCountry.phonePrefix} ", color = MaterialTheme.colorScheme.primary)
            },
            placeholder = {
                Text(if (selectedCountry.code == "IN") "10-digit number" else "Mobile Number")
            },
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
            label = { Text("Pincode / Zip") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        // GST field — only shown for India (driven by hasGstField from API)
        if (selectedCountry.hasGstField) {
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = gstNumber,
                onValueChange = { gstNumber = it.uppercase() },
                label = { Text("GST Number (Optional)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
        }

        Spacer(Modifier.height(24.dp))

        // --- COMPLIANCE ---
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(
                checked = agreedToTerms,
                onCheckedChange = { agreedToTerms = it }
            )
            Text(
                text = "I agree to the Terms & Conditions and Privacy Policy *",
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(start = 8.dp)
            )
        }

        Spacer(Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Checkbox(
                checked = marketingConsent,
                onCheckedChange = { marketingConsent = it }
            )
            Text(
                text = "Receive product updates and offers (Optional)",
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(start = 8.dp)
            )
        }

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
                
                // Regional phone validation
                val isPhoneValid = if (selectedCountry.code == "IN") {
                    contactPhone.length == 10 && contactPhone.first() in '6'..'9'
                } else {
                    contactPhone.length >= 8
                }

                if (businessName.isBlank() || contactPhone.isBlank() || city.isBlank() || state.isBlank()) {
                    error = "Please fill in all required (*) fields"
                    return@Button
                }

                if (!isPhoneValid) {
                    error = if (selectedCountry.code == "IN") "Please enter a valid 10-digit mobile number" else "Please enter a valid mobile number"
                    return@Button
                }

                if (!agreedToTerms) {
                    error = "You must agree to the Terms and Privacy Policy"
                    return@Button
                }

                loading = true
                error = null

                scope.launch {
                    try {
                        // Prepend dialing prefix for non-India numbers
                        val finalPhone = if (selectedCountry.code != "IN") {
                            "${selectedCountry.phonePrefix}$contactPhone"
                        } else {
                            contactPhone
                        }

                        val response = tenantApi.createTenant(
                            CreateTenantRequest(
                                name = businessName.trim(),
                                businessType = selectedCategory!!.name,
                                businessCategoryId = selectedCategory!!.id,
                                legalName = legalName.trim().takeIf { it.isNotEmpty() },
                                contactPhone = finalPhone,
                                addressLine1 = addressLine1.trim().takeIf { it.isNotEmpty() },
                                city = city.trim(),
                                state = state.trim(),
                                pincode = pincode.trim().takeIf { it.isNotEmpty() },
                                gstNumber = if (selectedCountry.hasGstField) gstNumber.trim().takeIf { it.isNotEmpty() } else null,
                                country = selectedCountry.name,
                                currency = currency,
                                timezone = timezone,
                                marketingConsent = marketingConsent,
                                acceptedPolicyVersion = "2026-03-01",
                                promoCode = promoCode.trim().takeIf { it.isNotEmpty() }
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
