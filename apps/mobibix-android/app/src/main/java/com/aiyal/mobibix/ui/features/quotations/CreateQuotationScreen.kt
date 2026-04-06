package com.aiyal.mobibix.ui.features.quotations

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.CreateQuotationDto
import com.aiyal.mobibix.data.network.CreateQuotationItemDto
import com.aiyal.mobibix.ui.features.customers.CustomerViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateQuotationScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    viewModel: QuotationViewModel = hiltViewModel(),
    customerViewModel: CustomerViewModel = hiltViewModel()
) {
    val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState()
    val saving by viewModel.saving.collectAsState()
    val customerUiState by customerViewModel.uiState.collectAsState()

    var customerId by remember { mutableStateOf<String?>(null) }
    var customerName by remember { mutableStateOf("") }
    var customerPhone by remember { mutableStateOf("") }
    var showCustomerCreate by remember { mutableStateOf(false) }
    var newCustName by remember { mutableStateOf("") }
    var newCustPhone by remember { mutableStateOf("") }
    var validityDays by remember { mutableStateOf("7") }
    var notes by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(customerName) {
        kotlinx.coroutines.delay(300)
        if (customerName.length >= 2) customerViewModel.loadCustomers(customerName)
    }
    LaunchedEffect(customerUiState.operationSuccess) {
        if (customerUiState.operationSuccess) {
            val created = customerUiState.customers.firstOrNull {
                it.name.equals(newCustName, ignoreCase = true)
            }
            if (created != null) {
                customerId = created.id
                customerName = created.name
                customerPhone = created.phone ?: ""
            }
            showCustomerCreate = false
        }
    }

    data class LineItem(var description: String, var qty: String, var price: String, var gstRate: String = "0")
    val items = remember { mutableStateListOf(LineItem("", "1", "")) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New Quotation", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text("Customer", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

            if (showCustomerCreate) {
                // Inline create new customer
                OutlinedTextField(
                    value = newCustName, onValueChange = { newCustName = it },
                    label = { Text("Name *") }, modifier = Modifier.fillMaxWidth(), singleLine = true
                )
                Spacer(Modifier.height(4.dp))
                OutlinedTextField(
                    value = newCustPhone, onValueChange = { newCustPhone = it },
                    label = { Text("Phone *") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { showCustomerCreate = false }, modifier = Modifier.weight(1f)) {
                        Text("Cancel")
                    }
                    Button(
                        onClick = {
                            customerViewModel.createCustomer(
                                name = newCustName, phone = newCustPhone, email = null,
                                address = "", businessType = "B2C", partyType = "CUSTOMER", gst = null
                            )
                        },
                        enabled = newCustName.isNotBlank() && newCustPhone.isNotBlank() && !customerUiState.operationLoading,
                        modifier = Modifier.weight(1f)
                    ) {
                        if (customerUiState.operationLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary)
                        } else Text("Create")
                    }
                }
            } else {
                Box {
                    OutlinedTextField(
                        value = customerName,
                        onValueChange = { customerName = it; customerId = null },
                        label = { Text("Customer Name *") },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
                        trailingIcon = {
                            if (customerUiState.loading) CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                            else if (customerId != null) Icon(Icons.Default.Person, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        },
                        modifier = Modifier.fillMaxWidth(), singleLine = true
                    )
                    if (customerUiState.customers.isNotEmpty() && customerId == null && customerName.isNotBlank()) {
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(top = 58.dp),
                            shape = MaterialTheme.shapes.medium,
                            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                        ) {
                            Column {
                                customerUiState.customers.take(6).forEach { c ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().clickable {
                                            customerId = c.id; customerName = c.name; customerPhone = c.phone
                                            customerViewModel.loadCustomers(null) // clear results
                                        }.padding(horizontal = 12.dp, vertical = 10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(Icons.Default.Person, contentDescription = null,
                                            modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                                        Column {
                                            Text(c.name, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                                            Text(c.phone, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                    HorizontalDivider()
                                }
                                TextButton(
                                    onClick = { showCustomerCreate = true; newCustName = customerName },
                                    modifier = Modifier.fillMaxWidth()
                                ) { Text("+ Create \"$customerName\" as new customer") }
                            }
                        }
                    }
                }
                OutlinedTextField(
                    value = customerPhone, onValueChange = { customerPhone = it },
                    label = { Text("Phone (optional)") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                )
            }
            OutlinedTextField(
                value = validityDays, onValueChange = { validityDays = it },
                label = { Text("Valid for (days)") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )

            HorizontalDivider()
            Text("Items", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

            items.forEachIndexed { idx, item ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Item ${idx + 1}", fontWeight = FontWeight.Medium, fontSize = 13.sp, modifier = Modifier.weight(1f))
                            if (items.size > 1) {
                                IconButton(onClick = { items.removeAt(idx) }, modifier = Modifier.size(24.dp)) {
                                    Icon(Icons.Default.Delete, contentDescription = "Remove", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                                }
                            }
                        }
                        OutlinedTextField(
                            value = item.description, onValueChange = { items[idx] = item.copy(description = it) },
                            label = { Text("Description") }, modifier = Modifier.fillMaxWidth(), singleLine = true
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = item.qty, onValueChange = { items[idx] = item.copy(qty = it) },
                                label = { Text("Qty") }, modifier = Modifier.weight(1f),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true
                            )
                            OutlinedTextField(
                                value = item.price, onValueChange = { items[idx] = item.copy(price = it) },
                                label = { Text("Price (₹)") }, modifier = Modifier.weight(1.5f),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true
                            )
                            OutlinedTextField(
                                value = item.gstRate, onValueChange = { items[idx] = item.copy(gstRate = it) },
                                label = { Text("GST %") }, modifier = Modifier.weight(1f),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true
                            )
                        }
                    }
                }
            }

            OutlinedButton(onClick = { items.add(LineItem("", "1", "")) }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("Add Item")
            }

            OutlinedTextField(
                value = notes, onValueChange = { notes = it },
                label = { Text("Notes (optional)") }, modifier = Modifier.fillMaxWidth(), minLines = 2
            )

            // Live total preview
            val total = items.sumOf { i ->
                val qty = i.qty.toDoubleOrNull() ?: 0.0
                val price = i.price.toDoubleOrNull() ?: 0.0
                val gst = i.gstRate.toDoubleOrNull() ?: 0.0
                val lineTotal = qty * price
                lineTotal + (lineTotal * gst / 100.0)
            }
            if (total > 0) {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                    Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Estimate Total", fontWeight = FontWeight.SemiBold)
                        Text("₹${String.format("%.2f", total)}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }

            error?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp) }

            Button(
                onClick = {
                    if (customerName.isBlank()) { error = "Customer name is required"; return@Button }
                    val shopId = activeShopId ?: return@Button
                    val lineItems = items.mapNotNull { i ->
                        val qty = i.qty.toIntOrNull() ?: return@mapNotNull null
                        val price = i.price.toDoubleOrNull() ?: return@mapNotNull null
                        val gst = i.gstRate.toDoubleOrNull() ?: 0.0
                        val lineTotal = qty * price
                        val gstAmt = lineTotal * (gst / 100.0)
                        CreateQuotationItemDto(
                            description = i.description.ifBlank { return@mapNotNull null },
                            quantity = qty, price = price, gstRate = gst,
                            gstAmount = gstAmt, lineTotal = lineTotal, totalAmount = lineTotal + gstAmt
                        )
                    }
                    if (lineItems.isEmpty()) { error = "Add at least one valid item"; return@Button }
                    viewModel.createQuotation(
                        shopId,
                        CreateQuotationDto(
                            customerName = customerName,
                            customerPhone = customerPhone.ifBlank { null },
                            validityDays = validityDays.toIntOrNull() ?: 7,
                            notes = notes.ifBlank { null },
                            items = lineItems
                        ),
                        onSuccess = { navController.popBackStack() },
                        onError = { error = it }
                    )
                },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                enabled = !saving,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                if (saving) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                else Text("Create Quotation", fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}
