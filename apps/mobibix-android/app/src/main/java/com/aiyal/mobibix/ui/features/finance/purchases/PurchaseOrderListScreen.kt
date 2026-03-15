package com.aiyal.mobibix.ui.features.finance.purchases

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.PurchaseOrder
import com.aiyal.mobibix.data.network.PurchaseOrderStatus
import java.text.NumberFormat
import java.util.Locale

private val TealAccent = Color(0xFF00C896)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PurchaseOrderListScreen(
    navController: NavController,
    viewModel: PurchaseViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale.Builder().setLanguage("en").setRegion("IN").build())

    LaunchedEffect(Unit) {
        viewModel.loadPurchaseOrders()
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { /* New PO flow if needed, or redirect to web */ },
                containerColor = TealAccent,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "New PO")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // ── Premium Header ──
            Surface(color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                    Text("Purchase Orders", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("Manage orders and receive stock", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            if (uiState.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = TealAccent)
            }

            if (uiState.error != null) {
                Text(text = uiState.error!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
            }

            if (uiState.purchaseOrders.isEmpty() && !uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("No active orders", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(8.dp))
                        Text("Open orders will appear here", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(uiState.purchaseOrders) { po ->
                        PurchaseOrderCard(po, currencyFormatter) {
                            navController.navigate("purchase_order_detail/${po.id}")
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PurchaseOrderCard(po: PurchaseOrder, formatter: NumberFormat, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = po.poNumber,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleMedium
                )
                PurchaseOrderStatusChip(po.status)
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(text = po.supplierName, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(10.dp))
            
            val totalAmount = po.items.sumOf { it.price * it.quantity }
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(text = "Amount", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                    Text(text = formatter.format(totalAmount), fontWeight = FontWeight.SemiBold)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(text = "Items", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                    Text(text = "${po.items.size} skus", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
fun PurchaseOrderStatusChip(status: PurchaseOrderStatus) {
    val (bgColor, textColor) = when (status) {
        PurchaseOrderStatus.DRAFT -> Color.Gray.copy(alpha = 0.12f) to Color.Gray
        PurchaseOrderStatus.ORDERED -> Color(0xFF3B82F6).copy(alpha = 0.12f) to Color(0xFF3B82F6)
        PurchaseOrderStatus.DISPATCHED -> Color(0xFF8B5CF6).copy(alpha = 0.12f) to Color(0xFF8B5CF6)
        PurchaseOrderStatus.PARTIALLY_RECEIVED -> Color(0xFFF59E0B).copy(alpha = 0.12f) to Color(0xFFF59E0B)
        PurchaseOrderStatus.RECEIVED -> TealAccent.copy(alpha = 0.12f) to TealAccent
        PurchaseOrderStatus.CANCELLED -> Color(0xFFEF4444).copy(alpha = 0.12f) to Color(0xFFEF4444)
    }
    Surface(color = bgColor, shape = RoundedCornerShape(8.dp)) {
        Text(
            text = status.name.replace("_", " "),
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            color = textColor
        )
    }
}
