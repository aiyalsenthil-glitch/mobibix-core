package com.aiyal.mobibix.ui.features.reports

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController

data class ReportType(
    val title: String,
    val description: String,
    val icon: ImageVector,
    val route: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsLandingScreen(navController: NavController) {
    val reportTypes = listOf(
        ReportType("Sales Report", "Detailed view of all sales", Icons.Default.Sell, "sales_report"),
        ReportType("Daily Sales", "Day-wise breakups", Icons.Default.Today, "daily_sales_report"),
        ReportType("Repair Report", "Track job card performance", Icons.Default.Build, "repair_report"),
        ReportType("Inventory Report", "Stock levels and value", Icons.Default.Inventory, "inventory_report"),
        ReportType("Profit & Loss", "Revenue and cost breakdown", Icons.Default.Assessment, "profit_loss_report"),
        ReportType("Tax Report", "GSTR and tax details", Icons.Default.Description, "tax_report"),
        ReportType("Receivables", "Pending from customers", Icons.Default.ArrowCircleDown, "receivables_report"),
        ReportType("Payables", "Pending to suppliers", Icons.Default.ArrowCircleUp, "payables_report")
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Reports") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
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
            items(reportTypes.size) { index ->
                val report = reportTypes[index]
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { navController.navigate(report.route) }
                ) {
                    ListItem(
                        headlineContent = { Text(report.title) },
                        supportingContent = { Text(report.description) },
                        leadingContent = { Icon(report.icon, contentDescription = null) },
                        trailingContent = { Icon(Icons.Default.ChevronRight, contentDescription = null) }
                    )
                }
            }
        }
    }
}
