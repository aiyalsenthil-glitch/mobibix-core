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
import com.aiyal.mobibix.data.network.BusinessCategory
import com.aiyal.mobibix.data.network.CountryOption
import com.aiyal.mobibix.data.network.INDIAN_STATES
import com.aiyal.mobibix.data.network.CreateTenantRequest
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.res.painterResource
import com.aiyal.mobibix.R
import dagger.hilt.android.EntryPointAccessors
import kotlinx.coroutines.launch

private val BrandTeal   = Color(0xFF14B8A6)
private val BrandDark   = Color(0xFF0D9488)
private val TealAccent  = BrandTeal

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
    var businessType by remember { mutableStateOf("") }
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

    // Promo preview
    var promoPreview by remember { mutableStateOf<com.aiyal.mobibix.data.network.PromoPreview?>(null) }
    var promoChecking by remember { mutableStateOf(false) }

    LaunchedEffect(promoCode) {
        if (promoCode.isBlank()) {
            promoPreview = null
            promoChecking = false
            return@LaunchedEffect
        }
        promoChecking = true
        promoPreview = null
        kotlinx.coroutines.delay(600)
        promoPreview = try { tenantApi.previewPromoCode(promoCode) } catch (_: Exception) { null }
        promoChecking = false
    }

    LaunchedEffect(Unit) {
        try {
            categories = tenantApi.getBusinessCategories()
            if (categories.isNotEmpty()) {
                selectedCategory = categories.firstOrNull { it.name == "Mobile Shop" } ?: categories.firstOrNull()
            }
        } catch (_: Exception) {
            // Non-fatal: businessType is free-text, categories are optional
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
        } catch (e: Exception) {
            android.util.Log.w("TenantRequired", "Failed to load countries: ${e.message}")
            // Non-fatal: user can still register; country defaults to IN
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFFF8FAFC))) {
        Column(modifier = Modifier.fillMaxSize().verticalScroll(scrollState)) {

            // ── Teal brand header ──────────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Brush.verticalGradient(listOf(BrandDark, BrandTeal)))
                    .statusBarsPadding()
                    .padding(horizontal = 24.dp, vertical = 28.dp)
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    // MobiBix logo on white circle background
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(Color.White),
                        contentAlignment = Alignment.Center
                    ) {
                        androidx.compose.foundation.Image(
                            painter = painterResource(id = R.drawable.mobibix_logo),
                            contentDescription = "MobiBix",
                            modifier = Modifier.size(44.dp)
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    Text("Business Setup", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("Let's get your business running on MobiBix", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.8f))
                    Spacer(Modifier.height(20.dp))

                    // ── Pill step indicator ────────────────────────────────
                    OnboardingStepper(currentStep = currentStep)
                }
            }

            // ── Form card (white, rounded top corners lift over header) ───
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .offset(y = (-16).dp)
                    .shadow(4.dp, RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)),
                color = Color.White,
                shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
            ) {
                Column(modifier = Modifier.padding(horizontal = 24.dp, vertical = 28.dp)) {
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
                                promoPreview = promoPreview,
                                promoChecking = promoChecking,
                                categories = categories,
                                selectedCategory = selectedCategory,
                                onCategorySelect = { selectedCategory = it },
                                categoriesLoading = categoriesLoading,
                                isExpanded = isExpanded,
                                onExpandedChange = { isExpanded = it },
                                businessType = businessType,
                                onBusinessTypeChange = { businessType = it }
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

                    Spacer(Modifier.height(24.dp))

                    // Buttons
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            modifier = Modifier.fillMaxWidth().height(50.dp),
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
                                                    businessType = businessType.trim().takeIf { it.isNotEmpty() },
                                                    businessCategoryId = selectedCategory?.id,
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
                                            navController.navigate("home") {
                                                popUpTo(0) { inclusive = true }
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
                            if (loading) {
                                CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                                Spacer(Modifier.width(8.dp))
                                Text("Creating...")
                            } else {
                                Text(if (currentStep == 3) "Complete Setup" else "Continue")
                                if (currentStep < 3) {
                                    Spacer(Modifier.width(6.dp))
                                    Icon(Icons.AutoMirrored.Filled.ArrowForward, null, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                        if (currentStep > 1) {
                            TextButton(
                                onClick = { currentStep--; error = null },
                                enabled = !loading,
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFF64748B))
                            ) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Back", style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    } // Column buttons
                }
            } // Surface
            Spacer(Modifier.height(32.dp))
        } // Column scroll
    } // Box
}

@Composable
fun OnboardingStepper(currentStep: Int) {
    val steps = listOf("Identity", "Location", "Regional")
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        steps.forEachIndexed { idx, label ->
            val stepNum = idx + 1
            val isCompleted = currentStep > stepNum
            val isActive = currentStep == stepNum
            Row(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(50))
                    .background(
                        when {
                            isCompleted -> Color.White
                            isActive    -> Color.White.copy(alpha = 0.25f)
                            else        -> Color.White.copy(alpha = 0.1f)
                        }
                    )
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isCompleted) {
                    Icon(Icons.Default.Check, null, modifier = Modifier.size(12.dp), tint = BrandTeal)
                    Spacer(Modifier.width(4.dp))
                }
                Text(
                    label,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = if (isActive || isCompleted) FontWeight.Bold else FontWeight.Normal,
                    color = when {
                        isCompleted -> BrandTeal
                        isActive    -> Color.White
                        else        -> Color.White.copy(alpha = 0.6f)
                    }
                )
            }
        }
    }
}

@Composable
fun IdentityStep(
    businessName: String, onBusinessNameChange: (String) -> Unit,
    legalName: String, onLegalNameChange: (String) -> Unit,
    promoCode: String, onPromoCodeChange: (String) -> Unit,
    promoPreview: com.aiyal.mobibix.data.network.PromoPreview?,
    promoChecking: Boolean,
    categories: List<BusinessCategory>, selectedCategory: BusinessCategory?,
    onCategorySelect: (BusinessCategory) -> Unit, categoriesLoading: Boolean,
    isExpanded: Boolean, onExpandedChange: (Boolean) -> Unit,
    businessType: String, onBusinessTypeChange: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        StepHeader("Business Identity", "How should customers identify you?")

        OutlinedTextField(
            value = businessName,
            onValueChange = onBusinessNameChange,
            label = { Text("Display Name *") },
            placeholder = { Text("e.g. Smart Tech Solutions") },
            leadingIcon = { Icon(Icons.Default.Store, null, tint = BrandTeal, modifier = Modifier.size(20.dp)) },
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(
            value = legalName,
            onValueChange = onLegalNameChange,
            label = { Text("Legal Entity Name") },
            placeholder = { Text("e.g. Smart Tech Pvt Ltd") },
            leadingIcon = { Icon(Icons.Default.AccountBalance, null, tint = BrandTeal, modifier = Modifier.size(20.dp)) },
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(
            value = businessType,
            onValueChange = onBusinessTypeChange,
            label = { Text("Business Category (Optional)") },
            placeholder = { Text("e.g. Mobile Retailer, Electronics Repair") },
            leadingIcon = { Icon(Icons.Default.Category, null, tint = BrandTeal, modifier = Modifier.size(20.dp)) },
            modifier = Modifier.fillMaxWidth()
        )

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            OutlinedTextField(
                value = promoCode,
                onValueChange = onPromoCodeChange,
                label = { Text("Promo Code (Optional)") },
                leadingIcon = { Icon(Icons.Default.LocalOffer, null, tint = BrandTeal, modifier = Modifier.size(20.dp)) },
                modifier = Modifier.fillMaxWidth(),
                textStyle = MaterialTheme.typography.bodyLarge.copy(color = TealAccent, fontWeight = FontWeight.Bold),
                trailingIcon = {
                    when {
                        promoChecking -> CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = TealAccent)
                        promoPreview?.valid == true -> Icon(Icons.Default.CheckCircle, null, tint = TealAccent, modifier = Modifier.size(20.dp))
                        promoPreview?.valid == false && promoCode.isNotBlank() -> Icon(Icons.Default.Cancel, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(20.dp))
                        else -> null
                    }
                }
            )

            // Promo preview badge
            AnimatedVisibility(visible = promoCode.isNotBlank() && !promoChecking) {
                promoPreview?.let { preview ->
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (preview.valid) TealAccent.copy(alpha = 0.1f) else MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                if (preview.valid) Icons.Default.LocalOffer else Icons.Default.Error,
                                null,
                                modifier = Modifier.size(16.dp),
                                tint = if (preview.valid) TealAccent else MaterialTheme.colorScheme.error
                            )
                            Column {
                                if (preview.valid) {
                                    Text(
                                        preview.badge ?: "Valid Code",
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = TealAccent
                                    )
                                    preview.benefit?.let {
                                        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    (preview.distributorName ?: preview.partnerName)?.let {
                                        Text("via $it", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                } else {
                                    Text(
                                        preview.reason ?: "Invalid promo code",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.error
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
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
                leadingIcon = { Icon(Icons.Default.Public, null, tint = BrandTeal, modifier = Modifier.size(20.dp)) },
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
            leadingIcon = { Icon(Icons.Default.Phone, null, tint = BrandTeal, modifier = Modifier.size(20.dp)) },
            prefix = { Text("${selectedCountry.phonePrefix} ", color = TealAccent, fontWeight = FontWeight.Bold) },
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(
            value = addressLine1,
            onValueChange = onAddressChange,
            label = { Text("Address") },
            leadingIcon = { Icon(Icons.Default.Home, null, tint = BrandTeal, modifier = Modifier.size(20.dp)) },
            modifier = Modifier.fillMaxWidth()
        )

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(
                value = city,
                onValueChange = onCityChange,
                label = { Text("City *") },
                leadingIcon = { Icon(Icons.Default.LocationCity, null, tint = BrandTeal, modifier = Modifier.size(20.dp)) },
                modifier = Modifier.weight(1f)
            )
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
                        leadingIcon = { Icon(Icons.Default.Map, null, tint = BrandTeal, modifier = Modifier.size(20.dp)) },
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
                OutlinedTextField(
                    value = state,
                    onValueChange = onStateChange,
                    label = { Text("State *") },
                    leadingIcon = { Icon(Icons.Default.Map, null, tint = BrandTeal, modifier = Modifier.size(20.dp)) },
                    modifier = Modifier.weight(1f)
                )
            }
        }

        OutlinedTextField(
            value = pincode,
            onValueChange = onPincodeChange,
            label = { Text("Pincode / Zip") },
            leadingIcon = { Icon(Icons.Default.MailOutline, null, tint = BrandTeal, modifier = Modifier.size(20.dp)) },
            modifier = Modifier.fillMaxWidth()
        )

        if (selectedCountry.hasGstField) {
            OutlinedTextField(
                value = gstNumber,
                onValueChange = onGstChange,
                label = { Text("GST Number (Optional)") },
                leadingIcon = { Icon(Icons.Default.Receipt, null, tint = BrandTeal, modifier = Modifier.size(20.dp)) },
                modifier = Modifier.fillMaxWidth()
            )
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
            leadingIcon = { Icon(Icons.Default.AttachMoney, null, tint = BrandTeal, modifier = Modifier.size(20.dp)) },
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(
            value = timezone,
            onValueChange = {},
            readOnly = true,
            label = { Text("Standard Timezone") },
            leadingIcon = { Icon(Icons.Default.Schedule, null, tint = BrandTeal, modifier = Modifier.size(20.dp)) },
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
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
        Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Color(0xFF64748B))
        Spacer(Modifier.height(4.dp))
        Box(modifier = Modifier.width(32.dp).height(3.dp).clip(RoundedCornerShape(2.dp)).background(BrandTeal))
        Spacer(Modifier.height(16.dp))
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
