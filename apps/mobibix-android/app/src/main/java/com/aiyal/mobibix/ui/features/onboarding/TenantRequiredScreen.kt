package com.aiyal.mobibix.ui.features.onboarding

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.aiyal.mobibix.core.app.AppState
import com.aiyal.mobibix.data.network.BusinessCategory
import com.aiyal.mobibix.data.network.CountryOption
import com.aiyal.mobibix.data.network.INDIAN_STATES
import com.aiyal.mobibix.data.network.CreateTenantRequest
import com.aiyal.mobibix.ui.components.AuroraBackground
import com.aiyal.mobibix.ui.components.GlassCard
import dagger.hilt.android.EntryPointAccessors
import kotlinx.coroutines.launch

private val TealAccent = Color(0xFF00C896)

private val DEFAULT_COUNTRIES = listOf(
    CountryOption("IN",  "India",                 "INR", "₹",   "+91",  "GST",  "Asia/Kolkata",      true),
    CountryOption("AE",  "United Arab Emirates",  "AED", "د.إ", "+971", "VAT",  "Asia/Dubai",        false),
    CountryOption("SG",  "Singapore",             "SGD", "S$",  "+65",  "GST",  "Asia/Singapore",    false),
    CountryOption("MY",  "Malaysia",              "MYR", "RM",  "+60",  "SST",  "Asia/Kuala_Lumpur", false),
    CountryOption("CA",  "Canada",                "CAD", "C$",  "+1",   "NONE", "America/Toronto",   false),
    CountryOption("GB",  "United Kingdom",        "GBP", "£",   "+44",  "VAT",  "Europe/London",     false),
    CountryOption("US",  "United States",         "USD", "$",   "+1",   "NONE", "America/New_York",  false),
    CountryOption("AU",  "Australia",             "AUD", "A$",  "+61",  "GST",  "Australia/Sydney",  false),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TenantRequiredScreen(
    navController: NavController
) {
    val context = LocalContext.current
    val entryPoint = EntryPointAccessors.fromApplication(context, OnboardingEntryPoint::class.java)

    val tenantApi = entryPoint.tenantApi()
    val tokenStore = entryPoint.tokenStore()
    val appStateResolver = entryPoint.appStateResolver()

    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    // Wizard State
    var currentStep by remember { mutableStateOf(1) }
    
    // Form Data
    var businessName by remember { mutableStateOf("") }
    var legalName by remember { mutableStateOf("") }
    var promoCode by remember { mutableStateOf("") }
    var categories by remember { mutableStateOf<List<BusinessCategory>>(emptyList()) }
    var selectedCategory by remember { mutableStateOf<BusinessCategory?>(null) }
    var isExpanded by remember { mutableStateOf(false) }

    var countries by remember { mutableStateOf(DEFAULT_COUNTRIES) }
    var selectedCountry by remember { mutableStateOf(DEFAULT_COUNTRIES.first()) }
    var currency by remember { mutableStateOf(DEFAULT_COUNTRIES.first().currency) }
    var timezone by remember { mutableStateOf(DEFAULT_COUNTRIES.first().timezone) }
    var isCountryExpanded by remember { mutableStateOf(false) }
    var isStateExpanded by remember { mutableStateOf(false) }

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
        try {
            categories = tenantApi.getBusinessCategories()
            if (categories.isNotEmpty()) {
                selectedCategory = categories.firstOrNull { it.name == "Mobile Shop" } ?: categories.firstOrNull()
            }
        } catch (e: Exception) {
            error = "Failed to load business categories"
        } finally {
            categoriesLoading = false
        }

        try {
            val fetched = tenantApi.getCountries()
            if (fetched.isNotEmpty()) {
                countries = fetched
                val india = fetched.firstOrNull { it.code == "IN" } ?: fetched.first()
                selectedCountry = india
                currency = india.currency
                timezone = india.timezone
            }
        } catch (e: Exception) {}
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AuroraBackground()
        
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 24.dp)
                .verticalScroll(scrollState),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(32.dp))
            
            // Header
            Text(
                text = "Business Setup",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = "Complete your profile to get started",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(Modifier.height(32.dp))

            // Stepper UI
            OnboardingStepper(currentStep = currentStep)

            Spacer(Modifier.height(32.dp))

            // Main Card
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(24.dp)) {
                    AnimatedContent(
                        targetState = currentStep,
                        transitionSpec = {
                            if (targetState > initialState) {
                                slideInHorizontally { it } + fadeIn() togetherWith slideOutHorizontally { -it } + fadeOut()
                            } else {
                                slideInHorizontally { -it } + fadeIn() togetherWith slideOutHorizontally { it } + fadeOut()
                            }
                        },
                        label = "step_content"
                    ) { step ->
                        when(step) {
                            1 -> IdentityStep(
                                businessName = businessName,
                                onBusinessNameChange = { businessName = it },
                                legalName = legalName,
                                onLegalNameChange = { legalName = it },
                                promoCode = promoCode,
                                onPromoCodeChange = { promoCode = it.uppercase() },
                                categories = categories,
                                selectedCategory = selectedCategory,
                                onCategorySelect = { selectedCategory = it },
                                categoriesLoading = categoriesLoading,
                                isExpanded = isExpanded,
                                onExpandedChange = { isExpanded = it }
                            )
                            2 -> LocationStep(
                                countries = countries,
                                selectedCountry = selectedCountry,
                                onCountrySelect = { 
                                    selectedCountry = it
                                    currency = it.currency
                                    timezone = it.timezone
                                    if (!it.hasGstField) gstNumber = ""
                                },
                                contactPhone = contactPhone,
                                onPhoneChange = { input ->
                                    val cleaned = input.filter { it.isDigit() }
                                    contactPhone = if (selectedCountry.code == "IN") {
                                        if (cleaned.startsWith("0")) cleaned.drop(1).take(10) else cleaned.take(10)
                                    } else {
                                        cleaned.take(15)
                                    }
                                },
                                addressLine1 = addressLine1,
                                onAddressChange = { addressLine1 = it },
                                city = city,
                                onCityChange = { city = it },
                                state = state,
                                onStateChange = { state = it },
                                pincode = pincode,
                                onPincodeChange = { pincode = it },
                                gstNumber = gstNumber,
                                onGstChange = { 
                                    var gstVal = it.uppercase()
                                    if (selectedCountry.code == "IN" && gstVal.length >= 2) {
                                        val prefix = gstVal.take(2)
                                        val matchedState = INDIAN_STATES.find { s -> s.gstCode == prefix }
                                        if (matchedState != null) {
                                            state = matchedState.name
                                        }
                                    }
                                    gstNumber = gstVal
                                },
                                isCountryExpanded = isCountryExpanded,
                                onCountryExpandedChange = { isCountryExpanded = it },
                                isStateExpanded = isStateExpanded,
                                onStateExpandedChange = { isStateExpanded = it }
                            )
                            3 -> regionalStep(
                                selectedCountry = selectedCountry,
                                currency = currency,
                                onCurrencyChange = { currency = it },
                                timezone = timezone,
                                onTimezoneChange = { timezone = it },
                                countries = countries,
                                agreedToTerms = agreedToTerms,
                                onTermsChange = { agreedToTerms = it },
                                marketingConsent = marketingConsent,
                                onMarketingChange = { marketingConsent = it }
                            )
                        }
                    }

                    if (error != null) {
                        Spacer(Modifier.height(16.dp))
                        Text(error!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }

                    Spacer(Modifier.height(32.dp))

                    // Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (currentStep > 1) {
                            TextButton(
                                onClick = { currentStep--; error = null },
                                enabled = !loading
                            ) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Back")
                            }
                        } else {
                            Box(Modifier.size(1.dp)) // Spacer
                        }

                        Button(
                            onClick = {
                                if (currentStep < 3) {
                                    val err = validateStep(currentStep, businessName, contactPhone, selectedCountry, city, state, agreedToTerms, gstNumber)
                                    if (err == null) {
                                        currentStep++
                                        error = null
                                    } else {
                                        error = err
                                    }
                                } else {
                                    // Submit
                                    if (!agreedToTerms) {
                                        error = "Please agree to the Terms & Conditions"
                                        return@Button
                                    }
                                    
                                    loading = true
                                    error = null
                                    scope.launch {
                                        try {
                                            val finalPhone = if (selectedCountry.code != "IN") {
                                                "${selectedCountry.phonePrefix}$contactPhone"
                                            } else {
                                                contactPhone
                                            }

                                            val response = tenantApi.createTenant(
                                                CreateTenantRequest(
                                                    name = businessName.trim(),
                                                    businessType = selectedCategory?.name ?: "Mobile Shop",
                                                    businessCategoryId = selectedCategory?.id ?: "",
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
                                            error = e.message ?: "Submission failed"
                                        } finally {
                                            loading = false
                                        }
                                    }
                                }
                            },
                            enabled = !loading,
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = TealAccent, contentColor = Color.White)
                        ) {
                            Text(if (currentStep == 3) (if (loading) "Creating..." else "Complete") else "Continue")
                            if (currentStep < 3) {
                                Spacer(Modifier.width(8.dp))
                                Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
            
            Spacer(Modifier.height(48.dp))
        }
    }
}

@Composable
fun OnboardingStepper(currentStep: Int) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        StepIndicator(label = "Identity", icon = Icons.Default.Business, active = currentStep >= 1, completed = currentStep > 1)
        Box(modifier = Modifier.weight(1f).height(1.dp).background(if(currentStep > 1) TealAccent else MaterialTheme.colorScheme.outlineVariant))
        StepIndicator(label = "Location", icon = Icons.Default.Place, active = currentStep >= 2, completed = currentStep > 2)
        Box(modifier = Modifier.weight(1f).height(1.dp).background(if(currentStep > 2) TealAccent else MaterialTheme.colorScheme.outlineVariant))
        StepIndicator(label = "Regional", icon = Icons.Default.Public, active = currentStep >= 3, completed = currentStep > 3)
    }
}

@Composable
fun StepIndicator(label: String, icon: ImageVector, active: Boolean, completed: Boolean) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(
            shape = CircleShape,
            color = if (completed) TealAccent else if (active) TealAccent.copy(alpha = 0.15f) else Color.Transparent,
            modifier = Modifier.size(40.dp),
            border = if (!completed && !active) androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)) else if (active && !completed) androidx.compose.foundation.BorderStroke(2.dp, TealAccent) else null
        ) {
            Box(contentAlignment = Alignment.Center) {
                if (completed) {
                    Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
                } else {
                    Icon(icon, contentDescription = null, tint = if (active) TealAccent else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f), modifier = Modifier.size(20.dp))
                }
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(label, style = MaterialTheme.typography.labelSmall, color = if (active) TealAccent else MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = if (active) FontWeight.Bold else FontWeight.Normal)
    }
}

@Composable
fun IdentityStep(
    businessName: String, onBusinessNameChange: (String) -> Unit,
    legalName: String, onLegalNameChange: (String) -> Unit,
    promoCode: String, onPromoCodeChange: (String) -> Unit,
    categories: List<BusinessCategory>, selectedCategory: BusinessCategory?,
    onCategorySelect: (BusinessCategory) -> Unit, categoriesLoading: Boolean,
    isExpanded: Boolean, onExpandedChange: (Boolean) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        StepHeader("Business Identity", "How should customers identify you?")
        
        OutlinedTextField(
            value = businessName,
            onValueChange = onBusinessNameChange,
            label = { Text("Display Name *") },
            placeholder = { Text("e.g. Smart Tech Solutions") },
            modifier = Modifier.fillMaxWidth()
        )
        
        OutlinedTextField(
            value = legalName,
            onValueChange = onLegalNameChange,
            label = { Text("Legal Entity Name") },
            placeholder = { Text("e.g. Smart Tech Pvt Ltd") },
            modifier = Modifier.fillMaxWidth()
        )

        @OptIn(ExperimentalMaterial3Api::class)
        ExposedDropdownMenuBox(
            expanded = isExpanded,
            onExpandedChange = onExpandedChange,
            modifier = Modifier.fillMaxWidth()
        ) {
            OutlinedTextField(
                value = selectedCategory?.name ?: "Select Type",
                onValueChange = {},
                readOnly = true,
                label = { Text("Business Category") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = isExpanded) },
                modifier = Modifier.menuAnchor().fillMaxWidth()
            )
            ExposedDropdownMenu(expanded = isExpanded, onDismissRequest = { onExpandedChange(false) }) {
                categories.forEach { category ->
                    DropdownMenuItem(text = { Text(category.name) }, onClick = { onCategorySelect(category); onExpandedChange(false) })
                }
            }
        }

        OutlinedTextField(
            value = promoCode,
            onValueChange = onPromoCodeChange,
            label = { Text("Promo Code (Optional)") },
            modifier = Modifier.fillMaxWidth(),
            textStyle = MaterialTheme.typography.bodyLarge.copy(color = TealAccent, fontWeight = FontWeight.Bold)
        )
    }
}

@Composable
fun LocationStep(
    countries: List<CountryOption>, selectedCountry: CountryOption, onCountrySelect: (CountryOption) -> Unit,
    contactPhone: String, onPhoneChange: (String) -> Unit,
    addressLine1: String, onAddressChange: (String) -> Unit,
    city: String, onCityChange: (String) -> Unit,
    state: String, onStateChange: (String) -> Unit,
    pincode: String, onPincodeChange: (String) -> Unit,
    gstNumber: String, onGstChange: (String) -> Unit,
    isCountryExpanded: Boolean, onCountryExpandedChange: (Boolean) -> Unit,
    isStateExpanded: Boolean, onStateExpandedChange: (Boolean) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        StepHeader("Location Details", "Where is your business based?")

        @OptIn(ExperimentalMaterial3Api::class)
        ExposedDropdownMenuBox(
            expanded = isCountryExpanded,
            onExpandedChange = onCountryExpandedChange,
            modifier = Modifier.fillMaxWidth()
        ) {
            OutlinedTextField(
                value = selectedCountry.name,
                onValueChange = {},
                readOnly = true,
                label = { Text("Country *") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = isCountryExpanded) },
                modifier = Modifier.menuAnchor().fillMaxWidth()
            )
            ExposedDropdownMenu(expanded = isCountryExpanded, onDismissRequest = { onCountryExpandedChange(false) }) {
                countries.forEach { country ->
                    DropdownMenuItem(text = { Text("${country.name} (${country.phonePrefix})") }, onClick = { onCountrySelect(country); onCountryExpandedChange(false) })
                }
            }
        }

        OutlinedTextField(
            value = contactPhone,
            onValueChange = onPhoneChange,
            label = { Text("Contact Phone *") },
            prefix = { Text("${selectedCountry.phonePrefix} ", color = TealAccent, fontWeight = FontWeight.Bold) },
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(value = addressLine1, onValueChange = onAddressChange, label = { Text("Address") }, modifier = Modifier.fillMaxWidth())
        
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(value = city, onValueChange = onCityChange, label = { Text("City *") }, modifier = Modifier.weight(1f))
            if (selectedCountry.code == "IN") {
                @OptIn(ExperimentalMaterial3Api::class)
                ExposedDropdownMenuBox(
                    expanded = isStateExpanded,
                    onExpandedChange = onStateExpandedChange,
                    modifier = Modifier.weight(1f)
                ) {
                    OutlinedTextField(
                        value = state,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("State *") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = isStateExpanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth()
                    )
                    ExposedDropdownMenu(expanded = isStateExpanded, onDismissRequest = { onStateExpandedChange(false) }) {
                        INDIAN_STATES.forEach { s ->
                            DropdownMenuItem(text = { Text(s.name) }, onClick = { onStateChange(s.name); onStateExpandedChange(false) })
                        }
                    }
                }
            } else {
                OutlinedTextField(value = state, onValueChange = onStateChange, label = { Text("State *") }, modifier = Modifier.weight(1f))
            }
        }

        OutlinedTextField(value = pincode, onValueChange = onPincodeChange, label = { Text("Pincode / Zip") }, modifier = Modifier.fillMaxWidth())

        if (selectedCountry.hasGstField) {
            OutlinedTextField(value = gstNumber, onValueChange = onGstChange, label = { Text("GST Number (Optional)") }, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
fun regionalStep(
    selectedCountry: CountryOption, currency: String, onCurrencyChange: (String) -> Unit,
    timezone: String, onTimezoneChange: (String) -> Unit, countries: List<CountryOption>,
    agreedToTerms: Boolean, onTermsChange: (Boolean) -> Unit,
    marketingConsent: Boolean, onMarketingChange: (Boolean) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        StepHeader("Regional Preferences", "Confirm your local settings")
        
        OutlinedTextField(
            value = "$currency (${selectedCountry.currencySymbol})",
            onValueChange = {},
            readOnly = true,
            label = { Text("Local Currency") },
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(
            value = timezone,
            onValueChange = {},
            readOnly = true,
            label = { Text("Standard Timezone") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(8.dp))
        
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = agreedToTerms, onCheckedChange = onTermsChange)
            Text("I agree to the Terms & Privacy Policy *", style = MaterialTheme.typography.bodySmall)
        }
        
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = marketingConsent, onCheckedChange = onMarketingChange)
            Text("Receive product updates & offers", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
fun StepHeader(title: String, subtitle: String) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(16.dp))
        TextButton(onClick = {}, modifier = Modifier.height(1.dp).fillMaxWidth().background(TealAccent.copy(alpha=0.1f))) {}
        Spacer(Modifier.height(8.dp))
    }
}

private fun validateStep(
    step: Int, name: String, phone: String, country: CountryOption, city: String, state: String, terms: Boolean, gstNumber: String
): String? {
    return when(step) {
        1 -> if (name.isBlank()) "Business name is required" else null
        2 -> {
            val isPhoneValid = if (country.code == "IN") phone.length == 10 else phone.length >= 8
            if (name.isBlank() || phone.isBlank() || !isPhoneValid || city.isBlank() || state.isBlank()) {
                "Required fields (*) missing or invalid"
            } else if (country.code == "IN" && gstNumber.isNotBlank()) {
                val regex = Regex("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
                if (!regex.matches(gstNumber)) {
                    "Invalid GST Number format. Expected: 22AAAAA0000A1Z5"
                } else {
                    val selState = INDIAN_STATES.find { it.name == state }
                    if (selState != null && !gstNumber.startsWith(selState.gstCode)) {
                        "GST must start with ${selState.gstCode} for ${selState.name}"
                    } else null
                }
            } else null
        }
        3 -> if (!terms) "Please agree to the Terms & Conditions" else null
        else -> "Invalid Step"
    }
}
