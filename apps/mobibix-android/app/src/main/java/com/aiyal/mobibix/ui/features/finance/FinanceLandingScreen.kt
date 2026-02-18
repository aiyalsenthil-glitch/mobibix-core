package com.aiyal.mobibix.ui.features.finance

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

data class FinanceModule(
    val title: String,
    val description: String,
    val icon: ImageVector,
    val route: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FinanceLandingScreen(navController: NavController) {
    val modules = listOf(
        FinanceModule("Purchases", "Manage stock purchases and suppliers", Icons.Default.ShoppingCart, "purchases"),
        FinanceModule("Receipts", "Log money received from customers", Icons.Default.Receipt, "receipts"),
        FinanceModule("Payment Vouchers", "Log expenses and supplier payments", Icons.Default.Payment, "vouchers")
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Finance") },
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
            items(modules.size) { index ->
                val module = modules[index]
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { navController.navigate(module.route) }
                ) {
                    ListItem(
                        headlineContent = { Text(module.title) },
                        supportingContent = { Text(module.description) },
                        leadingContent = { Icon(module.icon, contentDescription = null) },
                        trailingContent = { Icon(Icons.Default.ChevronRight, contentDescription = null) }
                    )
                }
            }
        }
    }
}
