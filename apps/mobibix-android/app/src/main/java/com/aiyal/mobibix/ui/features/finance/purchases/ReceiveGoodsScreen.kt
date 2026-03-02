package com.aiyal.mobibix.ui.features.finance.purchases

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.CreateGRNDto
import com.aiyal.mobibix.data.network.CreateGRNItemDto

private val TealAccent = Color(0xFF00C896)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReceiveGoodsScreen(
    poId: String,
    navController: NavController,
    viewModel: PurchaseViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val po = uiState.selectedPO
    
    // Local state for received quantities
    val receivedQuantities = remember { mutableStateMapOf<String, Int>() }

    LaunchedEffect(poId) {
        viewModel.loadPODetail(poId)
    }

    LaunchedEffect(uiState.actionSuccess) {
        if (uiState.actionSuccess) {
            navController.popBackStack()
            viewModel.resetActionSuccess()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Receive Goods") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (uiState.isLoading && po == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TealAccent)
            }
        } else if (po != null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(MaterialTheme.colorScheme.background)
            ) {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text("PO: ${po.poNumber}", fontWeight = FontWeight.Bold)
                                Text("Supplier: ${po.supplierName}", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                    }

                    itemsIndexed(po.items) { index, item ->
                        val currentQty = receivedQuantities[item.id] ?: (item.quantity - item.receivedQuantity).coerceAtLeast(0)
                        
                        // Initialize local state if not present
                        LaunchedEffect(item.id) {
                            if (!receivedQuantities.containsKey(item.id)) {
                                receivedQuantities[item.id] = (item.quantity - item.receivedQuantity).coerceAtLeast(0)
                            }
                        }

                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(item.description, fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.height(8.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Text("Pending: ${item.quantity - item.receivedQuantity}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                                        Text("UOM: ${item.uom ?: "Unit"}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                                    }
                                    
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        IconButton(
                                            onClick = { 
                                                val newQty = (receivedQuantities[item.id] ?: 0) - 1
                                                receivedQuantities[item.id] = newQty.coerceAtLeast(0)
                                            }
                                        ) {
                                            Text("-", style = MaterialTheme.typography.headlineSmall, color = TealAccent)
                                        }
                                        
                                        OutlinedTextField(
                                            value = receivedQuantities[item.id]?.toString() ?: "0",
                                            onValueChange = { 
                                                receivedQuantities[item.id] = it.toIntOrNull() ?: 0
                                            },
                                            modifier = Modifier.width(70.dp),
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                            textStyle = MaterialTheme.typography.bodyMedium,
                                            singleLine = true
                                        )

                                        IconButton(
                                            onClick = { 
                                                val newQty = (receivedQuantities[item.id] ?: 0) + 1
                                                receivedQuantities[item.id] = newQty
                                            }
                                        ) {
                                            Text("+", style = MaterialTheme.typography.headlineSmall, color = TealAccent)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shadowElevation = 16.dp,
                    color = MaterialTheme.colorScheme.surface
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Warning: Confirmation will update physical stock immediately.",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                        Button(
                            onClick = {
                                val grnItems = po.items.map { item ->
                                    CreateGRNItemDto(
                                        poItemId = item.id,
                                        shopProductId = item.shopProductId,
                                        receivedQuantity = receivedQuantities[item.id] ?: 0,
                                        confirmedPrice = item.price,
                                        uom = item.uom
                                    )
                                }.filter { it.receivedQuantity > 0 }

                                if (grnItems.isEmpty()) return@Button

                                viewModel.createGrn(
                                    CreateGRNDto(
                                        shopId = po.shopId,
                                        poId = po.id,
                                        grnNumber = "GRN-${System.currentTimeMillis() / 1000}",
                                        receivedDate = null,
                                        isVarianceOverridden = false,
                                        overrideNote = null,
                                        items = grnItems
                                    )
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = TealAccent),
                            shape = RoundedCornerShape(12.dp),
                            enabled = !uiState.isLoading
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text("Confirm & Update Stock", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
