package com.aiyal.mobibix.ui.features.sales

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.CreateInvoiceRequest
import com.aiyal.mobibix.data.network.InvoiceItemRequest
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewSaleScreen(
    shopId: String,
    navController: NavController,
    viewModel: SalesViewModel = hiltViewModel()
) {
    val products by viewModel.products.collectAsState()
    val gstEnabled by viewModel.gstEnabled.collectAsState()
    var customerName by remember { mutableStateOf("") }
    var customerPhone by remember { mutableStateOf("") }
    var paymentMode by remember { mutableStateOf("CASH") }

    val items = remember { mutableStateListOf<InvoiceItemUi>() }

    val saving by viewModel.saving.collectAsState()

    LaunchedEffect(shopId) {
        if (shopId.isNotBlank()) {
            viewModel.loadInitialData(shopId)
        }
    }

    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

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
            item {
                Card(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Customer Details", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(bottom = 8.dp))
                        OutlinedTextField(value = customerName, onValueChange = { customerName = it }, label = { Text("Customer Name (Optional)") }, modifier = Modifier.fillMaxWidth())
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(value = customerPhone, onValueChange = { customerPhone = it }, label = { Text("Customer Phone (Optional)") }, modifier = Modifier.fillMaxWidth())
                    }
                }
            }

            items(items.toList()) { item ->
                InvoiceItemRow(
                    item = item,
                    products = products,
                    onRemove = { items.remove(item) },
                    onItemChange = { updatedItem ->
                        val index = items.indexOf(item)
                        if (index != -1) {
                            items[index] = updatedItem
                        }
                    },
                    gstEnabled = gstEnabled
                )
            }

            item {
                Button(onClick = { items.add(InvoiceItemUi()) }) {
                    Text("Add Item")
                }
            }
            
            item {
                Card(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Payment", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(bottom = 8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(selected = paymentMode == "CASH", onClick = { paymentMode = "CASH" })
                            Text("Cash")
                            Spacer(modifier = Modifier.size(16.dp))
                            RadioButton(selected = paymentMode == "UPI", onClick = { paymentMode = "UPI" })
                            Text("UPI")  // ONLINE is not a valid backend PaymentMode
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    enabled = items.none { it.productId == null } && items.isNotEmpty() && !saving,
                    onClick = {
                        val request = CreateInvoiceRequest(
                            shopId = shopId,
                            customerName = customerName.takeIf { it.isNotBlank() },
                            customerPhone = customerPhone.takeIf { it.isNotBlank() },
                            paymentMode = paymentMode,
                            items = items.mapNotNull { item ->
                                item.productId?.let {
                                    val appliedGstRate = if (item.gstRate == -1.0) item.customGstRate ?: 0.0 else item.gstRate
                                    InvoiceItemRequest(
                                        shopProductId = it,
                                        quantity = item.quantity,
                                        rate = item.rate,        // Already in Rupees (salePrice/100)
                                        gstRate = appliedGstRate // Double — no Float precision issues
                                        // lineTotal intentionally omitted — not in backend DTO
                                        // gstAmount intentionally omitted — backend recalculates
                                    )
                                }
                            }
                        )
                        viewModel.createInvoice(
                            request = request, 
                            onSuccess = { navController.popBackStack() }, 
                            onError = { error ->
                                scope.launch {
                                    snackbarHostState.showSnackbar("Error: $error")
                                }
                            }
                        )
                    },
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    if (saving) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                    } else {
                        Text("Create Invoice")
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}
