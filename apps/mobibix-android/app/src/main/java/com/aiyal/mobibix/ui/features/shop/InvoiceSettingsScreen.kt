package com.aiyal.mobibix.ui.features.shop

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.ShopApi
import com.aiyal.mobibix.data.network.UpdateShopSettingsRequest
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceSettingsScreen(
    shopId: String,
    navController: NavController,
    shopApi: ShopApi
) {
    var gstNumber by remember { mutableStateOf("") }
    var gstEnabled by remember { mutableStateOf(false) }
    var invoiceFooter by remember { mutableStateOf("") }
    
    var isLoading by remember { mutableStateOf(true) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    var shopDetails by remember { mutableStateOf<com.aiyal.mobibix.data.network.ShopDetails?>(null) }

    LaunchedEffect(shopId) {
        try {
            val details = shopApi.getShopSettings(shopId)
            shopDetails = details
            gstNumber = details.gstNumber ?: ""
            gstEnabled = details.gstEnabled
            invoiceFooter = details.invoiceFooter ?: ""
        } finally {
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Invoice Settings") },
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
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            if (isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            } else {
                Text("Tax & GST Settings", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(16.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Enable GST calculation")
                    Switch(checked = gstEnabled, onCheckedChange = { gstEnabled = it })
                }
                
                OutlinedTextField(
                    value = gstNumber,
                    onValueChange = { gstNumber = it },
                    label = { Text("GST Number") },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = gstEnabled
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                Text("Appearance", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(16.dp))
                
                OutlinedTextField(
                    value = invoiceFooter,
                    onValueChange = { invoiceFooter = it },
                    label = { Text("Invoice Footer (Bank Details, etc.)") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Button(
                    onClick = {
                        saving = true
                        scope.launch {
                            shopDetails?.let { d ->
                                val request = UpdateShopSettingsRequest(
                                    name = d.name,
                                    address = d.address,
                                    phone = d.phone,
                                    gstEnabled = gstEnabled,
                                    gstNumber = if (gstEnabled) gstNumber else null,
                                    invoiceFooter = invoiceFooter,
                                    terms = d.terms ?: emptyList()
                                )
                                shopApi.updateShopSettings(shopId, request)
                                navController.popBackStack()
                            }
                            saving = false
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !saving
                ) {
                    if (saving) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    } else {
                        Text("Save Invoice Settings")
                    }
                }
            }
        }
    }
}
