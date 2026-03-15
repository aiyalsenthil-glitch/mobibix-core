package com.aiyal.mobibix.ui.features.loyalty

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.LoyaltyHistoryItem
import com.aiyal.mobibix.ui.theme.MobiBixTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoyaltyScreen(
    navController: NavController,
    viewModel: LoyaltyViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Overview", "Manage Points")

    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Loyalty Program") },
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
                .fillMaxSize()
                .padding(padding)
        ) {
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title) }
                    )
                }
            }

            when (selectedTab) {
                0 -> LoyaltyOverview(uiState)
                1 -> LoyaltyManage(viewModel, uiState)
            }
        }
    }
}

@Composable
fun LoyaltyOverview(uiState: LoyaltyUiState) {
    Column(modifier = Modifier.padding(16.dp)) {
        if (uiState.isLoading) {
            LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
        }

        uiState.summary?.let { summary ->
            GridStats(summary)
            Spacer(modifier = Modifier.height(16.dp))
            Text("Recent Activity", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(uiState.history) { item ->
                    LoyaltyHistoryRow(item)
                }
            }
        }
    }
}

@Composable
fun GridStats(summary: com.aiyal.mobibix.data.network.LoyaltySummary) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        StatCard("Customers", "${summary.totalCustomers}", Modifier.weight(1f))
        Spacer(modifier = Modifier.width(8.dp))
        StatCard("Points Issued", "${summary.totalPointsIssued}", Modifier.weight(1f))
        Spacer(modifier = Modifier.width(8.dp))
        StatCard("Redeemed", "${summary.totalPointsRedeemed}", Modifier.weight(1f))
    }
}

@Composable
fun StatCard(title: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(title, style = MaterialTheme.typography.labelSmall)
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun LoyaltyHistoryRow(item: LoyaltyHistoryItem) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .padding(12.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(item.customerName, fontWeight = FontWeight.Bold)
                Text(item.date, style = MaterialTheme.typography.bodySmall)
                if (item.description != null) {
                    Text(item.description, style = MaterialTheme.typography.bodySmall)
                }
            }
            Text(
                text = "${if (item.type == "EARNED") "+" else "-"}${item.points}",
                color = if (item.type == "EARNED") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
fun LoyaltyManage(viewModel: LoyaltyViewModel, uiState: LoyaltyUiState) {
    var customerId by remember { mutableStateOf("") }
    var points by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var isRedeem by remember { mutableStateOf(false) }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (uiState.actionSuccess != null) {
            Text(uiState.actionSuccess, color = MaterialTheme.colorScheme.primary)
            LaunchedEffect(uiState.actionSuccess) {
                // Clear inputs on success
                customerId = ""
                points = ""
                description = ""
            }
        }
        if (uiState.error != null) {
            Text(uiState.error, color = MaterialTheme.colorScheme.error)
        }

        OutlinedTextField(
            value = customerId,
            onValueChange = { customerId = it },
            label = { Text("Customer ID / Phone") },
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(
            value = points,
            onValueChange = { points = it },
            label = { Text("Points") },
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(
            value = description,
            onValueChange = { description = it },
            label = { Text("Description (Optional)") },
            modifier = Modifier.fillMaxWidth()
        )

        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = isRedeem, onCheckedChange = { isRedeem = it })
            Text("Redeem Points (Deduct)")
        }

        Button(
            onClick = {
                val p = points.toIntOrNull()
                if (customerId.isNotBlank() && p != null) {
                    if (isRedeem) {
                        viewModel.redeemPoints(customerId, p, description)
                    } else {
                        viewModel.addPoints(customerId, p, description)
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !uiState.isLoading
        ) {
            Text(if (isRedeem) "Redeem Points" else "Add Points")
        }
    }
}
