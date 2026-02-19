package com.aiyal.mobibix.ui.features.reports

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController

private val TealAccent = Color(0xFF00C896)

data class ReportType(
    val title: String,
    val description: String,
    val icon: ImageVector,
    val route: String,
    val accentColor: Color = TealAccent
)

@Composable
fun ReportsLandingScreen(navController: NavController) {
    val reportTypes = listOf(
        ReportType("Sales Report", "Detailed view of all sales", Icons.Default.Sell, "sales_report", TealAccent),
        ReportType("Daily Sales", "Day-wise breakups", Icons.Default.Today, "daily_sales_report", Color(0xFF3B82F6)),
        ReportType("Repair Report", "Track job card performance", Icons.Default.Build, "repair_report", Color(0xFF8B5CF6)),
        ReportType("Inventory Report", "Stock levels and value", Icons.Default.Inventory, "inventory_report", Color(0xFFF59E0B)),
        ReportType("Profit & Loss", "Revenue and cost breakdown", Icons.Default.Assessment, "profit_loss_report", Color(0xFFEF4444)),
        ReportType("Tax Report", "GSTR and tax details", Icons.Default.Description, "tax_report", Color(0xFF06B6D4)),
        ReportType("Receivables", "Pending from customers", Icons.Default.ArrowCircleDown, "receivables_report", Color(0xFF22C55E)),
        ReportType("Payables", "Pending to suppliers", Icons.Default.ArrowCircleUp, "payables_report", Color(0xFFEC4899))
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // ── Premium Header ──
        Surface(color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                Text("Reports", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("Business insights and analytics", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(reportTypes.size) { index ->
                val report = reportTypes[index]
                Card(
                    modifier = Modifier.fillMaxWidth().clickable { navController.navigate(report.route) },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp).fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = report.accentColor.copy(alpha = 0.12f),
                            modifier = Modifier.size(44.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(report.icon, contentDescription = null, tint = report.accentColor, modifier = Modifier.size(22.dp))
                            }
                        }
                        Spacer(Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(report.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Spacer(Modifier.height(2.dp))
                            Text(report.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}
