package com.aiyal.mobibix.ui.features.finance

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController

private val TealAccent = Color(0xFF00C896)

data class FinanceModule(
    val title: String,
    val description: String,
    val icon: ImageVector,
    val route: String,
    val accentColor: Color = TealAccent
)

@Composable
fun FinanceLandingScreen(navController: NavController) {
    val modules = listOf(
        FinanceModule("Purchases", "Manage stock purchases and suppliers", Icons.Default.ShoppingCart, "purchases", Color(0xFF3B82F6)),
        FinanceModule("Receipts", "Log money received from customers", Icons.Default.Receipt, "receipts", TealAccent),
        FinanceModule("Payment Vouchers", "Log expenses and supplier payments", Icons.Default.Payment, "vouchers", Color(0xFF8B5CF6))
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // ── Premium Header ──
        Surface(color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                Text("Finance", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("Manage payments and transactions", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(modules.size) { index ->
                val module = modules[index]
                Card(
                    modifier = Modifier.fillMaxWidth().clickable { navController.navigate(module.route) },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(20.dp).fillMaxWidth(),
                        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = module.accentColor.copy(alpha = 0.12f),
                            modifier = Modifier.size(48.dp)
                        ) {
                            Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
                                Icon(module.icon, contentDescription = null, tint = module.accentColor, modifier = Modifier.size(24.dp))
                            }
                        }
                        Spacer(Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(module.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Spacer(Modifier.height(2.dp))
                            Text(module.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}
