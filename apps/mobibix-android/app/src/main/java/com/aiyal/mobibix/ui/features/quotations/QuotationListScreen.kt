package com.aiyal.mobibix.ui.features.quotations

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Description
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.Quotation

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuotationListScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    viewModel: QuotationViewModel = hiltViewModel()
) {
    val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState()
    val state by viewModel.listState.collectAsState()
    var statusFilter by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(activeShopId, statusFilter) {
        activeShopId?.let { viewModel.loadQuotations(it, statusFilter) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Quotations", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { navController.navigate("create_quotation") },
                containerColor = MaterialTheme.colorScheme.primary
            ) { Icon(Icons.Default.Add, contentDescription = "Create", tint = Color.White) }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            // Status filters
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val filters = listOf(null to "All", "DRAFT" to "Draft", "SENT" to "Sent", "ACCEPTED" to "Accepted", "EXPIRED" to "Expired", "CONVERTED" to "Converted")
                items(filters) { (s, label) ->
                    FilterChip(selected = statusFilter == s, onClick = { statusFilter = s }, label = { Text(label, fontSize = 12.sp) })
                }
            }

            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
                state.error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(state.error!!, color = MaterialTheme.colorScheme.error)
                }
                state.quotations.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.Description, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
                        Text("No quotations", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Create your first quote", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
                    }
                }
                else -> LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(state.quotations) { q ->
                        QuotationCard(q) {
                            navController.navigate("quotation_detail/${activeShopId}/${q.id}")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun QuotationCard(q: Quotation, onClick: () -> Unit) {
    val colorScheme = MaterialTheme.colorScheme
    val statusColor = when (q.status) {
        "DRAFT" -> Color(0xFFF59E0B)
        "SENT" -> Color(0xFF3B82F6)
        "ACCEPTED" -> Color(0xFF00C896)
        "REJECTED" -> colorScheme.error
        "EXPIRED" -> Color(0xFF6B7280)
        "CONVERTED" -> Color(0xFF8B5CF6)
        else -> colorScheme.primary
    }

    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface)
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(q.quotationNumber, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(q.customerName, fontSize = 13.sp, color = colorScheme.onSurfaceVariant)
                if (q.expiryDate != null) {
                    Text("Expires: ${q.expiryDate.take(10)}", fontSize = 11.sp, color = colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
                }
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("₹${String.format("%.2f", q.totalAmount)}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Surface(shape = RoundedCornerShape(20.dp), color = statusColor.copy(alpha = 0.12f)) {
                    Text(q.status, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp), fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = statusColor)
                }
            }
        }
    }
}
