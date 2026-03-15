package com.aiyal.mobibix.ui.features.shop

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.core.shop.ShopContextStore
import com.aiyal.mobibix.data.network.CreateShopRequest
import com.aiyal.mobibix.data.network.ShopApi
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateShopScreen(
    shopApi: ShopApi,
    shopContextStore: ShopContextStore,
    shopContextProvider: ShopContextProvider,
    onShopCreated: () -> Unit
) {
    val scope = rememberCoroutineScope()

    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var addressLine1 by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var state by remember { mutableStateOf("") }
    var pincode by remember { mutableStateOf("") }
    var invoicePrefix by remember { mutableStateOf("") }
    var gstNumber by remember { mutableStateOf("") }
    var website by remember { mutableStateOf("") }
    var invoiceFooter by remember { mutableStateOf("") }

    var isLoading by remember { mutableStateOf(false) }

    val requiredFields = listOf(name, phone, addressLine1, city, state, pincode, invoicePrefix)
    val areAllRequiredFieldsFilled = requiredFields.all { it.isNotBlank() }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Add New Shop") })
        }
    ) {
        Column(
            modifier = Modifier
                .padding(it)
                .fillMaxSize()
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // --- REQUIRED FIELDS ---
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Shop Name*") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone*") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = addressLine1, onValueChange = { addressLine1 = it }, label = { Text("Address Line 1*") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = city, onValueChange = { city = it }, label = { Text("City*") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = state, onValueChange = { state = it }, label = { Text("State*") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = pincode, onValueChange = { pincode = it }, label = { Text("Pincode*") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = invoicePrefix, onValueChange = { invoicePrefix = it.uppercase().filter { char -> !char.isWhitespace() } }, label = { Text("Invoice Prefix*") }, modifier = Modifier.fillMaxWidth())

            Spacer(modifier = Modifier.height(16.dp))
            Text("Optional Fields", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))

            // --- OPTIONAL FIELDS ---
            OutlinedTextField(value = gstNumber, onValueChange = { gstNumber = it }, label = { Text("GST Number") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = website, onValueChange = { website = it }, label = { Text("Website") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = invoiceFooter, onValueChange = { invoiceFooter = it }, label = { Text("Invoice Footer") }, modifier = Modifier.fillMaxWidth())

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    isLoading = true
                    scope.launch {
                        try {
                            val request = CreateShopRequest(
                                name = name,
                                phone = phone,
                                addressLine1 = addressLine1,
                                city = city,
                                state = state,
                                pincode = pincode,
                                invoicePrefix = invoicePrefix,
                                gstNumber = gstNumber.takeIf { it.isNotBlank() },
                                website = website.takeIf { it.isNotBlank() },
                                invoiceFooter = invoiceFooter.takeIf { it.isNotBlank() },
                                logoUrl = null
                            )
                            val newShop = shopApi.createShop(request)
                            shopContextStore.setActiveShopId(newShop.id)
                            shopContextProvider.updateShopId(newShop.id)
                            onShopCreated()
                        } catch (e: Exception) {
                            // Handle error appropriately, e.g., show a snackbar
                        } finally {
                            isLoading = false
                        }
                    }
                },
                enabled = areAllRequiredFieldsFilled && !isLoading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (isLoading) "Creating..." else "Create Shop")
            }
        }
    }
}
