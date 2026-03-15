package com.aiyal.mobibix.ui.features.finance.purchases

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
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
fun PurchaseOrderDetailScreen(
    poId: String,
    navController: NavController,
    viewModel: PurchaseViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale.Builder().setLanguage("en").setRegion("IN").build())

    LaunchedEffect(poId) {
        viewModel.loadPODetail(poId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Order Details") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        bottomBar = {
            val po = uiState.selectedPO
            if (po != null && (po.status == PurchaseOrderStatus.ORDERED || po.status == PurchaseOrderStatus.DISPATCHED || po.status == PurchaseOrderStatus.PARTIALLY_RECEIVED)) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shadowElevation = 8.dp
                ) {
                    Button(
                        onClick = { navController.navigate("receive_goods/${po.id}") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = TealAccent),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Receive Goods", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    ) { padding ->
        val po = uiState.selectedPO

        if (uiState.isLoading && po == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TealAccent)
            }
        } else if (po != null) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(MaterialTheme.colorScheme.background),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    OrderInfoCard(po)
                }

                item {
                    Text("Order Items", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }

                items(po.items) { item ->
                    OrderItemRow(item, currencyFormatter)
                }

                item {
                    Spacer(Modifier.height(80.dp)) // Padding for bottom bar
                }
            }
        }
    }
}

@Composable
fun OrderInfoCard(po: PurchaseOrder) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("PO Number", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                    Text(po.poNumber, fontWeight = FontWeight.Bold)
                }
                PurchaseOrderStatusChip(po.status)
            }
            Spacer(Modifier.height(12.dp))
            Text("Supplier", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
            Text(po.supplierName, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Order Date", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                    Text(po.orderDate.substring(0, 10))
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text("Exp. Delivery", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                    Text(po.expectedDeliveryDate?.substring(0, 10) ?: "Not specified")
                }
            }
        }
    }
}

@Composable
fun OrderItemRow(item: com.aiyal.mobibix.data.network.PurchaseOrderItem, formatter: NumberFormat) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(item.description, fontWeight = FontWeight.Medium)
            Spacer(Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${item.quantity} ${item.uom ?: "units"} @ ${formatter.format(item.price)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Surface(
                    color = if (item.receivedQuantity >= item.quantity) TealAccent.copy(alpha = 0.1f) else Color.Gray.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = "Recvd: ${item.receivedQuantity}/${item.quantity}",
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = if (item.receivedQuantity >= item.quantity) TealAccent else Color.Gray
                    )
                }
            }
        }
    }
}
