package com.aiyal.mobibix.ui.features.finance.purchases

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.GRN
import com.aiyal.mobibix.data.network.GRNStatus

private val TealAccent = Color(0xFF00C896)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GRNListScreen(
    navController: NavController,
    viewModel: PurchaseViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadGrns() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Goods Receipt Notes", fontWeight = FontWeight.Bold)
                        Text(
                            "Stock arrivals from suppliers",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
        ) {
            if (uiState.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = TealAccent)
            }

            if (uiState.grns.isEmpty() && !uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.Inventory, contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
                        )
                        Spacer(Modifier.height(12.dp))
                        Text("No GRNs yet", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Receive goods from a Purchase Order", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
                    }
                }
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(uiState.grns) { grn ->
                        GRNListItem(grn = grn, onClick = { navController.navigate("grn_detail/${grn.id}") })
                    }
                }
            }
        }
    }
}

@Composable
private fun GRNListItem(grn: GRN, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(44.dp).background(TealAccent.copy(alpha = 0.1f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Inventory, contentDescription = null, tint = TealAccent, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(grn.grnNumber, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(2.dp))
                Text("Received: ${grn.receivedDate.take(10)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("${grn.items.size} item(s)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            GRNStatusChip(grn.status)
        }
    }
}

@Composable
fun GRNStatusChip(status: GRNStatus) {
    val (bg, fg) = when (status) {
        GRNStatus.CONFIRMED -> Pair(Color(0xFF00C896).copy(alpha = 0.12f), Color(0xFF00C896))
        GRNStatus.DRAFT     -> Pair(Color(0xFFF59E0B).copy(alpha = 0.12f), Color(0xFFF59E0B))
        GRNStatus.CANCELLED -> Pair(Color(0xFFEF4444).copy(alpha = 0.12f), Color(0xFFEF4444))
    }
    Surface(color = bg, shape = RoundedCornerShape(6.dp)) {
        Text(
            status.name,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            style = MaterialTheme.typography.labelSmall,
            color = fg,
            fontWeight = FontWeight.SemiBold
        )
    }
}
