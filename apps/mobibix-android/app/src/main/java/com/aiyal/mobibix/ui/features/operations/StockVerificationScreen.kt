package com.aiyal.mobibix.ui.features.operations

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.FactCheck
import androidx.compose.material.icons.filled.PlayArrow
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
import com.aiyal.mobibix.data.network.StockVerificationSession

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StockVerificationScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    viewModel: OperationsViewModel = hiltViewModel()
) {
    val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState()
    val state by viewModel.stockVerificationState.collectAsState()

    LaunchedEffect(activeShopId) { activeShopId?.let { viewModel.loadStockVerifications(it) } }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Stock Verification", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { navController.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        floatingActionButton = {
            if (state.activeSession == null && !state.saving) {
                FloatingActionButton(
                    onClick = { activeShopId?.let { viewModel.startStockVerification(it) } },
                    containerColor = MaterialTheme.colorScheme.primary
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = "Start", tint = Color.White)
                }
            }
        }
    ) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
            else -> LazyColumn(
                modifier = Modifier.padding(padding).padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(vertical = 12.dp)
            ) {
                // Active session
                state.activeSession?.let { session ->
                    item {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF00C896).copy(alpha = 0.08f)),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Icon(Icons.AutoMirrored.Filled.FactCheck, contentDescription = null, tint = Color(0xFF00C896), modifier = Modifier.size(20.dp))
                                    Text("Active Verification", fontWeight = FontWeight.Bold, color = Color(0xFF00C896))
                                }
                                Text("Started: ${session.createdAt.take(10)}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                val items = session.items ?: emptyList()
                                val counted = items.count { it.countedQty != null }
                                Text("$counted / ${items.size} items counted", fontSize = 13.sp)

                                if (counted > 0) {
                                    LinearProgressIndicator(
                                        progress = { if (items.isEmpty()) 0f else counted.toFloat() / items.size },
                                        modifier = Modifier.fillMaxWidth().height(6.dp),
                                        color = Color(0xFF00C896)
                                    )
                                }

                                Button(
                                    onClick = { viewModel.confirmStockVerification(session.id) { activeShopId?.let { viewModel.loadStockVerifications(it) } } },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C896)),
                                    modifier = Modifier.fillMaxWidth()
                                ) { Text("Confirm & Apply Variances") }
                            }
                        }
                    }
                }

                // History
                if (state.sessions.any { it.status != "DRAFT" }) {
                    item { Text("Previous Sessions", fontWeight = FontWeight.SemiBold, fontSize = 14.sp) }
                    items(state.sessions.filter { it.status != "DRAFT" }) { session ->
                        SessionCard(session)
                    }
                }

                if (state.sessions.isEmpty()) {
                    item {
                        Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.AutoMirrored.Filled.FactCheck, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
                                Spacer(Modifier.height(8.dp))
                                Text("No verifications yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("Tap + to start a new session", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SessionCard(session: StockVerificationSession) {
    val statusColor = when (session.status) {
        "CONFIRMED" -> Color(0xFF00C896)
        "CANCELLED" -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    Card(
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(session.createdAt.take(10), fontWeight = FontWeight.Medium, fontSize = 13.sp)
                if (session.confirmedAt != null) Text("Confirmed: ${session.confirmedAt.take(10)}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Surface(shape = RoundedCornerShape(20.dp), color = statusColor.copy(alpha = 0.12f)) {
                Text(session.status, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp), fontSize = 10.sp, color = statusColor, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
