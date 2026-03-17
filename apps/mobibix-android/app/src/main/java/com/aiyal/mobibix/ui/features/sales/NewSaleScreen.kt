package com.aiyal.mobibix.ui.features.sales

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.CreateInvoiceRequest
import com.aiyal.mobibix.data.network.InvoiceItemRequest
import com.aiyal.mobibix.ui.features.customers.CustomerViewModel
import kotlinx.coroutines.launch

private val PAYMENT_MODES = listOf("CASH", "UPI", "CARD", "BANK_TRANSFER", "CREDIT")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewSaleScreen(
    shopId: String,
    navController: NavController,
    viewModel: SalesViewModel = hiltViewModel(),
    customerViewModel: CustomerViewModel = hiltViewModel()
) {
    val products by viewModel.products.collectAsState()
    val gstEnabled by viewModel.gstEnabled.collectAsState()

    var customerId by remember { mutableStateOf<String?>(null) }
    var customerName by remember { mutableStateOf("") }
    var customerPhone by remember { mutableStateOf("") }
    var showCustomerPicker by remember { mutableStateOf(false) }
    var paymentMode by remember { mutableStateOf("CASH") }

    val items = remember { mutableStateListOf<InvoiceItemUi>() }
    val saving by viewModel.saving.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(shopId) {
        if (shopId.isNotBlank()) {
            viewModel.loadInitialData(shopId)
            customerViewModel.loadCustomers()
        }
    }

    if (showCustomerPicker) {
        CustomerPickerDialog(
            customerViewModel = customerViewModel,
            onDismiss = { showCustomerPicker = false },
            onCustomerSelected = { id, name, phone ->
                customerId = id
                customerName = name
                customerPhone = phone ?: ""
                showCustomerPicker = false
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New Sale") },
                navigationIcon = {
                    IconButton(onClick = { navController.navigateUp() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            // ── Customer ──────────────────────────────────────────────────────
            item {
                Card(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Customer",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                        if (customerId != null) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Person, contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.size(8.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(customerName, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                    if (customerPhone.isNotBlank())
                                        Text(customerPhone, style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                TextButton(onClick = { customerId = null; customerName = ""; customerPhone = "" }) {
                                    Text("Change")
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                        }
                        OutlinedButton(
                            onClick = { showCustomerPicker = true },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.size(6.dp))
                            Text(if (customerId == null) "Search Existing Customer" else "Search Different Customer")
                        }
                        if (customerId == null) {
                            Spacer(Modifier.height(8.dp))
                            Text("Or enter manually:", style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(4.dp))
                            OutlinedTextField(
                                value = customerName, onValueChange = { customerName = it },
                                label = { Text("Customer Name") }, modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value = customerPhone, onValueChange = { customerPhone = it },
                                label = { Text("Customer Phone") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            }

            // ── Items ─────────────────────────────────────────────────────────
            items(items.toList()) { item ->
                InvoiceItemRow(
                    item = item, products = products,
                    onRemove = { items.remove(item) },
                    onItemChange = { updatedItem ->
                        val index = items.indexOf(item)
                        if (index != -1) items[index] = updatedItem
                    },
                    gstEnabled = gstEnabled
                )
            }

            item {
                Button(onClick = { items.add(InvoiceItemUi()) }, modifier = Modifier.padding(vertical = 4.dp)) {
                    Text("+ Add Item")
                }
            }

            // ── Payment Mode ──────────────────────────────────────────────────
            item {
                Card(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Payment Mode *", style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 8.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            PAYMENT_MODES.forEach { mode ->
                                FilterChip(
                                    selected = paymentMode == mode,
                                    onClick = { paymentMode = mode },
                                    label = { Text(mode.replace("_", " "), style = MaterialTheme.typography.labelSmall) }
                                )
                            }
                        }
                    }
                }
            }

            // ── Submit ────────────────────────────────────────────────────────
            item {
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    enabled = items.none { it.productId == null } && items.isNotEmpty() && !saving,
                    onClick = {
                        val request = CreateInvoiceRequest(
                            shopId = shopId,
                            customerId = customerId,
                            customerName = customerName.takeIf { it.isNotBlank() },
                            customerPhone = customerPhone.takeIf { it.isNotBlank() },
                            paymentMode = paymentMode,
                            items = items.mapNotNull { item ->
                                item.productId?.let {
                                    val appliedGstRate = if (item.gstRate == -1.0) item.customGstRate ?: 0.0 else item.gstRate
                                    InvoiceItemRequest(
                                        shopProductId = it,
                                        quantity = item.quantity,
                                        rate = item.rate,
                                        gstRate = appliedGstRate
                                    )
                                }
                            }
                        )
                        viewModel.createInvoice(
                            request = request,
                            onSuccess = { navController.popBackStack() },
                            onError = { error -> scope.launch { snackbarHostState.showSnackbar(error) } }
                        )
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    if (saving) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                    } else {
                        Text("Create Invoice", style = MaterialTheme.typography.labelLarge)
                    }
                }
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}

@Composable
private fun CustomerPickerDialog(
    customerViewModel: CustomerViewModel,
    onDismiss: () -> Unit,
    onCustomerSelected: (id: String, name: String, phone: String?) -> Unit
) {
    val uiState by customerViewModel.uiState.collectAsState()
    var query by remember { mutableStateOf("") }

    val filtered by remember(query, uiState.customers) {
        derivedStateOf {
            if (query.isBlank()) uiState.customers
            else uiState.customers.filter {
                it.name.contains(query, ignoreCase = true) ||
                it.phone.contains(query, ignoreCase = true)
            }
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Select Customer") },
        text = {
            Column {
                OutlinedTextField(
                    value = query, onValueChange = { query = it },
                    placeholder = { Text("Search by name or phone") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    modifier = Modifier.fillMaxWidth(), singleLine = true
                )
                Spacer(Modifier.height(8.dp))
                if (uiState.loading) {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally).padding(16.dp))
                } else if (filtered.isEmpty()) {
                    Text(
                        if (query.isBlank()) "No customers found" else "No match for \"$query\"",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(8.dp)
                    )
                } else {
                    LazyColumn(modifier = Modifier.height(300.dp)) {
                        items(filtered.take(50)) { customer ->
                            ListItem(
                                headlineContent = { Text(customer.name) },
                                supportingContent = { Text(customer.phone) },
                                modifier = Modifier.clickable {
                                    onCustomerSelected(customer.id, customer.name, customer.phone)
                                }
                            )
                            HorizontalDivider()
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
