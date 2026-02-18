package com.aiyal.mobibix.ui.features.shop

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.ShopApi
import com.aiyal.mobibix.data.network.UpdateShopSettingsRequest
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JobCardSettingsScreen(
    shopId: String,
    navController: NavController,
    shopApi: ShopApi
) {
    var terms by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    
    var shopDetails by remember { mutableStateOf<com.aiyal.mobibix.data.network.ShopDetails?>(null) }

    LaunchedEffect(shopId) {
        try {
            val details = shopApi.getShopSettings(shopId)
            shopDetails = details
            terms = details.terms?.joinToString("\n") ?: ""
        } finally {
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Job Card Settings") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
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
                Text("Job Card Terms & Conditions", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = terms,
                    onValueChange = { terms = it },
                    label = { Text("Terms (One per line)") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 10,
                    maxLines = 15
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
                                    gstEnabled = d.gstEnabled,
                                    gstNumber = d.gstin,
                                    invoiceFooter = d.invoiceFooter,
                                    terms = terms.lines().filter { it.isNotBlank() }
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
                        Text("Save Settings")
                    }
                }
            }
        }
    }
}
