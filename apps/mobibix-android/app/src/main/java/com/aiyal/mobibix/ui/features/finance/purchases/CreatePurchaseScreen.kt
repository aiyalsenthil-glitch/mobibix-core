package com.aiyal.mobibix.ui.features.finance.purchases

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.PurchaseItemDto
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreatePurchaseScreen(
    navController: NavController,
    viewModel: PurchaseViewModel = hiltViewModel()
) {
    var supplierName by remember { mutableStateOf("") }
    var invoiceNumber by remember { mutableStateOf("") }
    var paymentMethod by remember { mutableStateOf("CASH") }
    val items = remember { mutableStateListOf<PurchaseItemDto>() }
    
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.actionSuccess) {
        if (uiState.actionSuccess) {
            viewModel.resetActionSuccess()
            navController.popBackStack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New Purchase") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    TextButton(
                        onClick = {
                            viewModel.createPurchase(
                                supplierName = supplierName,
                                invoiceNumber = invoiceNumber,
                                paymentMethod = paymentMethod,
                                items = items.toList()
                            )
                        },
                        enabled = supplierName.isNotBlank() && invoiceNumber.isNotBlank() && items.isNotEmpty() && !uiState.isLoading
                    ) {
                        Text("Save")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                OutlinedTextField(
                    value = supplierName,
                    onValueChange = { supplierName = it },
                    label = { Text("Supplier Name") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
            item {
                OutlinedTextField(
                    value = invoiceNumber,
                    onValueChange = { invoiceNumber = it },
                    label = { Text("Invoice Number") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
            item {
                Text("Items", style = MaterialTheme.typography.titleMedium)
                // Add Item Logic Placeholder
                Button(onClick = { 
                    items.add(PurchaseItemDto(null, "New Item", null, 1, 0.0, null)) 
                }, modifier = Modifier.padding(top = 8.dp)) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Add Item")
                }
            }
            
            items(items) { item ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(text = item.description, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                            Text(text = "Qty: ${item.quantity} | Price: ${item.purchasePrice}")
                        }
                        IconButton(onClick = { items.remove(item) }) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }
    }
}
