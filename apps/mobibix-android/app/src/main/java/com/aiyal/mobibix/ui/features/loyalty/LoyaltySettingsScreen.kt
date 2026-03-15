package com.aiyal.mobibix.ui.features.loyalty

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.LoyaltyConfig

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoyaltySettingsScreen(
    navController: NavController,
    viewModel: LoyaltyViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    var isEnabled by remember { mutableStateOf(false) }
    var earnAmountPerPoint by remember { mutableStateOf("") }
    var pointValueInRupees by remember { mutableStateOf("") }
    var maxRedeemPercent by remember { mutableStateOf("") }
    var allowOnRepairs by remember { mutableStateOf(false) }
    var allowOnAccessories by remember { mutableStateOf(false) }
    var allowOnServices by remember { mutableStateOf(false) }
    var expiryDays by remember { mutableStateOf("") }
    var allowManualAdjustment by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadConfig()
    }

    LaunchedEffect(uiState.config) {
        uiState.config?.let { config ->
            isEnabled = config.isEnabled
            earnAmountPerPoint = config.earnAmountPerPoint.toString()
            pointValueInRupees = config.pointValueInRupees.toString()
            maxRedeemPercent = config.maxRedeemPercent.toString()
            allowOnRepairs = config.allowOnRepairs
            allowOnAccessories = config.allowOnAccessories
            allowOnServices = config.allowOnServices
            expiryDays = config.expiryDays?.toString() ?: ""
            allowManualAdjustment = config.allowManualAdjustment
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Loyalty Settings") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
        ) {
            if (uiState.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            uiState.actionSuccess?.let { msg ->
                Text(
                    text = msg,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(16.dp),
                    fontWeight = FontWeight.Bold
                )
                LaunchedEffect(msg) {
                    kotlinx.coroutines.delay(3000)
                    viewModel.clearActionSuccess()
                }
            }

            uiState.error?.let { err ->
                Text(
                    text = err,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(16.dp)
                )
            }

            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // Enable switch
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Enable Loyalty Program", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text("Allow customers to earn/redeem points", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(checked = isEnabled, onCheckedChange = { isEnabled = it })
                }

                if (isEnabled) {
                    HorizontalDivider()

                    Text("Earning Rules", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)

                    OutlinedTextField(
                        value = earnAmountPerPoint,
                        onValueChange = { earnAmountPerPoint = it },
                        label = { Text("Earn 1 Point For Every (₹)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        supportingText = { Text("e.g. 100 means spend ₹100 = 1 point") }
                    )

                    OutlinedTextField(
                        value = pointValueInRupees,
                        onValueChange = { pointValueInRupees = it },
                        label = { Text("Value of 1 Point (₹)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth(),
                        supportingText = { Text("e.g. 1 means 1 point = ₹1 discount") }
                    )

                    HorizontalDivider()

                    Text("Redemption & Expiry", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)

                    OutlinedTextField(
                        value = maxRedeemPercent,
                        onValueChange = { maxRedeemPercent = it },
                        label = { Text("Max Redeem % of Invoice") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        supportingText = { Text("Max percentage of total bill that can be paid via points (e.g. 50)") }
                    )

                    OutlinedTextField(
                        value = expiryDays,
                        onValueChange = { expiryDays = it },
                        label = { Text("Points Expiry (Days)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        supportingText = { Text("Leave empty for points that never expire") }
                    )

                    HorizontalDivider()

                    Text("Categories Allowed", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = allowOnRepairs, onCheckedChange = { allowOnRepairs = it })
                        Text("Repairs")
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = allowOnAccessories, onCheckedChange = { allowOnAccessories = it })
                        Text("Accessories")
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = allowOnServices, onCheckedChange = { allowOnServices = it })
                        Text("Services")
                    }

                    HorizontalDivider()
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = allowManualAdjustment, onCheckedChange = { allowManualAdjustment = it })
                        Text("Allow Manual Adjustments by Admins")
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
                
                Button(
                    onClick = {
                        val config = LoyaltyConfig(
                            tenantId = uiState.config?.tenantId,
                            isEnabled = isEnabled,
                            earnAmountPerPoint = earnAmountPerPoint.toIntOrNull() ?: 100,
                            pointValueInRupees = pointValueInRupees.toDoubleOrNull() ?: 1.0,
                            maxRedeemPercent = maxRedeemPercent.toIntOrNull() ?: 100,
                            allowOnRepairs = allowOnRepairs,
                            allowOnAccessories = allowOnAccessories,
                            allowOnServices = allowOnServices,
                            expiryDays = expiryDays.toIntOrNull(),
                            allowManualAdjustment = allowManualAdjustment
                        )
                        viewModel.saveConfig(config)
                    },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    enabled = !uiState.isSavingConfig
                ) {
                    Text(if (uiState.isSavingConfig) "Saving..." else "Save Loyalty Settings")
                }
            }
        }
    }
}
