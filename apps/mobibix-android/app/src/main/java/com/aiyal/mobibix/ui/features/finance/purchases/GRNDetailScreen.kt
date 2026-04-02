package com.aiyal.mobibix.ui.features.finance.purchases

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import com.aiyal.mobibix.data.network.GRNItem
import com.aiyal.mobibix.data.network.GRNStatus
import java.text.NumberFormat
import java.util.Locale

private val TealAccent = Color(0xFF00C896)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GRNDetailScreen(
    grnId: String,
    navController: NavController,
    viewModel: PurchaseViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currencyFormatter = NumberFormat.getCurrencyInstance(
        Locale.Builder().setLanguage("en").setRegion("IN").build()
    )
    var showConfirmDialog by remember { mutableStateOf(false) }

    LaunchedEffect(grnId) { viewModel.loadGrnDetail(grnId) }

    LaunchedEffect(uiState.actionSuccess) {
        if (uiState.actionSuccess) {
            viewModel.resetActionSuccess()
            navController.popBackStack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("GRN Details", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        bottomBar = {
            val grn = uiState.selectedGRN
            if (grn != null && grn.status == GRNStatus.DRAFT) {
                Surface(modifier = Modifier.fillMaxWidth(), shadowElevation = 8.dp) {
                    Button(
                        onClick = { showConfirmDialog = true },
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = TealAccent),
                        shape = RoundedCornerShape(12.dp),
                        enabled = !uiState.isLoading
                    ) {
                        if (uiState.isLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                        } else {
                            Text("Confirm GRN & Update Stock", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    ) { padding ->
        val grn = uiState.selectedGRN

        if (uiState.isLoading && grn == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TealAccent)
            }
        } else if (grn != null) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(MaterialTheme.colorScheme.background),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item { GRNInfoCard(grn) }
                item {
                    Text("Items Received", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }
                items(grn.items) { item ->
                    GRNItemRow(item, currencyFormatter)
                }
                if (grn.isVarianceOverridden && !grn.overrideNote.isNullOrBlank()) {
                    item {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF59E0B).copy(alpha = 0.08f))
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text("Variance Override Note", style = MaterialTheme.typography.labelSmall, color = Color(0xFFF59E0B))
                                Spacer(Modifier.height(4.dp))
                                Text(grn.overrideNote, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
                item { Spacer(Modifier.height(80.dp)) }
            }
        }
    }

    if (showConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showConfirmDialog = false },
            title = { Text("Confirm GRN") },
            text = { Text("This will update stock quantities for all items in this GRN. This action cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        showConfirmDialog = false
                        val grn = uiState.selectedGRN
                        if (grn != null) viewModel.confirmGrn(grn.id, grn.poId)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = TealAccent)
                ) { Text("Confirm") }
            },
            dismissButton = { TextButton(onClick = { showConfirmDialog = false }) { Text("Cancel") } }
        )
    }
}

@Composable
private fun GRNInfoCard(grn: GRN) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("GRN Number", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                    Text(grn.grnNumber, fontWeight = FontWeight.Bold)
                }
                GRNStatusChip(grn.status)
            }
            Spacer(Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Received Date", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                    Text(grn.receivedDate.take(10))
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text("Total Items", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                    Text("${grn.items.size}", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun GRNItemRow(item: GRNItem, formatter: NumberFormat) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text("Product ID: ${item.shopProductId}", fontWeight = FontWeight.Medium, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(4.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(
                    "Qty: ${item.receivedQuantity} ${item.uom ?: "units"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (item.confirmedPrice != null) {
                    Text(
                        "@ ${formatter.format(item.confirmedPrice)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = TealAccent,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}
