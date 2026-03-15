package com.aiyal.mobibix.ui.features.shop

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.ShopApi
import com.aiyal.mobibix.data.network.UpdateShopSettingsRequest
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShopSettingsScreen(
    shopId: String,
    navController: NavController,
    shopApi: ShopApi
) {
    var name by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var gstNumber by remember { mutableStateOf("") }
    var gstEnabled by remember { mutableStateOf(false) }
    var invoiceFooter by remember { mutableStateOf("") }
    var terms by remember { mutableStateOf("") }

    var isLoading by remember { mutableStateOf(true) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    if (shopId.isBlank()) {
        Text("Invalid shop")
        return
    }

    LaunchedEffect(shopId) {
        try {
            val details = shopApi.getShopSettings(shopId)
            name = details.name ?: ""
            address = details.address ?: ""
            phone = details.phone ?: ""
            gstNumber = details.gstNumber ?: ""
            gstEnabled = details.gstEnabled
            invoiceFooter = details.invoiceFooter ?: ""
            terms = details.terms?.joinToString("\n") ?: ""
        } finally {
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Shop Settings") })
        }
    ) {
        Column(
            modifier = Modifier
                .padding(it)
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {

            if (isLoading) {
                CircularProgressIndicator()
            } else {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Shop Name") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = address, onValueChange = { address = it }, label = { Text("Address") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(16.dp))

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    Text("GST Enabled")
                    Switch(
                        checked = gstEnabled,
                        onCheckedChange = { gstEnabled = it }
                    )
                }
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = gstNumber, onValueChange = { gstNumber = it }, label = { Text("GST Number") }, modifier = Modifier.fillMaxWidth(), enabled = gstEnabled)
                
                Spacer(Modifier.height(16.dp))
                OutlinedTextField(value = invoiceFooter, onValueChange = { invoiceFooter = it }, label = { Text("Invoice Footer") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = terms, onValueChange = { terms = it }, label = { Text("Terms & Conditions") }, modifier = Modifier.fillMaxWidth(), maxLines = 5)
                Spacer(Modifier.height(16.dp))

                Button(
                    enabled = !saving,
                    onClick = {
                        saving = true
                        scope.launch {
                            val request = UpdateShopSettingsRequest(
                                name = name,
                                address = address,
                                phone = phone,
                                gstEnabled = gstEnabled,
                                gstNumber = if (gstEnabled) gstNumber.takeIf { it.isNotBlank() } else null,
                                invoiceFooter = invoiceFooter.takeIf { it.isNotBlank() },
                                terms = terms.lines().filter { it.isNotBlank() }
                            )
                            shopApi.updateShopSettings(shopId, request)
                            saving = false
                            navController.popBackStack()
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Save")
                }
            }
        }
    }
}
