package com.aiyal.mobibix.ui.features.distributor

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.DistributorOrder
import com.aiyal.mobibix.data.network.DistributorRetailer

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DistributorDashboardScreen(
    navController: NavController,
    onUpgradeToERP: () -> Unit,
    viewModel: DistributorViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var activeTab by remember { mutableStateOf(0) }
    val tabs = listOf("Overview", "Orders", "Retailers")

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Distributor Hub", fontWeight = FontWeight.Bold)
                        state.profile?.referralCode?.let {
                            Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadDashboard() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        }
    ) { padding ->
        when {
            state.loading -> {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            !state.isRegistered -> {
                DistributorRegistrationScreen(
                    modifier = Modifier.padding(padding),
                    registerState = viewModel.registerState.collectAsState().value,
                    onRegister = { name, code -> viewModel.register(name, code) }
                )
            }
            state.error != null -> {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(state.error!!, color = MaterialTheme.colorScheme.error)
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadDashboard() }) { Text("Retry") }
                    }
                }
            }
            else -> {
                Column(Modifier.fillMaxSize().padding(padding)) {
                    TabRow(selectedTabIndex = activeTab) {
                        tabs.forEachIndexed { i, title ->
                            Tab(selected = activeTab == i, onClick = { activeTab = i }, text = { Text(title) })
                        }
                    }
                    when (activeTab) {
                        0 -> OverviewTab(state, onUpgradeToERP)
                        1 -> OrdersTab(state.orders, viewModel)
                        2 -> RetailersTab(state.retailers)
                    }
                }
            }
        }
    }
}

@Composable
private fun OverviewTab(
    state: DistributorDashboardState,
    onUpgradeToERP: () -> Unit
) {
    val analytics = state.analytics
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Stats grid
        item {
            Text("Performance", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatCard(Modifier.weight(1f), "Active Retailers", analytics?.activeRetailers?.toString() ?: "—", Icons.Default.Store)
                StatCard(Modifier.weight(1f), "Total Orders", analytics?.totalOrders?.toString() ?: "—", Icons.Default.ShoppingCart)
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatCard(Modifier.weight(1f), "Monthly Revenue", "₹${analytics?.monthlyRevenue?.toLong() ?: 0}", Icons.Default.CurrencyRupee)
                StatCard(Modifier.weight(1f), "Units Sold", analytics?.unitsSold?.toString() ?: "—", Icons.Default.Inventory)
            }
        }

        // Referral code card
        state.profile?.let { profile ->
            item {
                Spacer(Modifier.height(4.dp))
                Text("Your Referral Code", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text(
                            profile.referralCode,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "Share this code with retailers to earn commissions",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                        )
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("${profile.totalReferrals} referrals", style = MaterialTheme.typography.labelMedium)
                            Text("•", style = MaterialTheme.typography.labelMedium)
                            Text("₹${profile.pendingEarnings.toLong()} pending", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
            }
        }

        // Pending orders
        if ((analytics?.pendingOrders ?: 0) > 0) {
            item {
                Spacer(Modifier.height(4.dp))
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Pending, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                        Spacer(Modifier.width(12.dp))
                        Text(
                            "${analytics?.pendingOrders} orders awaiting confirmation",
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }

        // Upgrade to ERP CTA
        item {
            Spacer(Modifier.height(4.dp))
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.RocketLaunch, contentDescription = null, tint = MaterialTheme.colorScheme.tertiary)
                        Spacer(Modifier.width(8.dp))
                        Text("Upgrade to MobiBix ERP", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Manage your own retail shop, run sales, track inventory, and handle job cards — all in one place.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onTertiaryContainer.copy(alpha = 0.8f)
                    )
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = onUpgradeToERP,
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Get ERP Access")
                    }
                }
            }
        }
    }
}

@Composable
private fun OrdersTab(
    orders: List<DistributorOrder>,
    viewModel: DistributorViewModel
) {
    if (orders.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No orders yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(orders) { order ->
            OrderCard(order, viewModel)
        }
    }
}

@Composable
private fun OrderCard(order: DistributorOrder, viewModel: DistributorViewModel) {
    Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(order.retailerName, fontWeight = FontWeight.Bold)
                OrderStatusChip(order.status)
            }
            Spacer(Modifier.height(4.dp))
            Text("₹${order.totalAmount} · ${order.itemCount} items", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (order.status == "PENDING") {
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { viewModel.confirmOrder(order.id) }, modifier = Modifier.weight(1f)) { Text("Confirm") }
                }
            } else if (order.status == "CONFIRMED") {
                Spacer(Modifier.height(8.dp))
                Button(onClick = { viewModel.shipOrder(order.id) }, modifier = Modifier.fillMaxWidth()) { Text("Mark Shipped") }
            }
        }
    }
}

@Composable
private fun OrderStatusChip(status: String) {
    val (color, bg) = when (status) {
        "PENDING" -> MaterialTheme.colorScheme.error to MaterialTheme.colorScheme.errorContainer
        "CONFIRMED" -> MaterialTheme.colorScheme.primary to MaterialTheme.colorScheme.primaryContainer
        "SHIPPED" -> MaterialTheme.colorScheme.tertiary to MaterialTheme.colorScheme.tertiaryContainer
        "DELIVERED" -> Color(0xFF2E7D32) to Color(0xFFE8F5E9)
        else -> MaterialTheme.colorScheme.outline to MaterialTheme.colorScheme.surfaceVariant
    }
    Box(
        Modifier.background(bg, RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(status, style = MaterialTheme.typography.labelSmall, color = color)
    }
}

@Composable
private fun RetailersTab(retailers: List<DistributorRetailer>) {
    if (retailers.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No retailers yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(retailers) { retailer ->
            Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text(retailer.businessName, fontWeight = FontWeight.Bold)
                    retailer.city?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    Spacer(Modifier.height(4.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("${retailer.totalOrders} orders", style = MaterialTheme.typography.labelSmall)
                        if (retailer.creditBalance != 0.0) {
                            Text("Credit: ₹${retailer.creditBalance.toLong()}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatCard(modifier: Modifier, label: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Card(modifier = modifier, shape = RoundedCornerShape(12.dp)) {
        Column(Modifier.padding(12.dp)) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
            Spacer(Modifier.height(4.dp))
            Text(value, fontWeight = FontWeight.Bold, fontSize = 20.sp)
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun DistributorRegistrationScreen(
    modifier: Modifier,
    registerState: DistributorRegisterState,
    onRegister: (String, String) -> Unit
) {
    var brandName by remember { mutableStateOf("") }
    var referralCode by remember { mutableStateOf("DIST-") }

    Box(modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.Store, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(16.dp))
            Text("Activate Distributor Hub", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(
                "Set up your distributor profile to manage wholesale orders and track retail referrals.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(vertical = 8.dp)
            )
            Spacer(Modifier.height(24.dp))
            OutlinedTextField(
                value = brandName,
                onValueChange = { brandName = it },
                label = { Text("Brand / Business Name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                leadingIcon = { Icon(Icons.Default.Business, contentDescription = null) }
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = referralCode,
                onValueChange = {
                    referralCode = if (it.startsWith("DIST-")) it.uppercase() else "DIST-${it.uppercase()}"
                },
                label = { Text("Referral Code (DIST-XXXX)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters),
                supportingText = { Text("Format: DIST- followed by 4-10 letters/numbers") },
                leadingIcon = { Icon(Icons.Default.Tag, contentDescription = null) }
            )
            registerState.error?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = { onRegister(brandName.trim(), referralCode.trim()) },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = brandName.isNotBlank() && referralCode.length >= 8 && !registerState.loading
            ) {
                if (registerState.loading) CircularProgressIndicator(Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                else Text("Activate Hub Now")
            }
        }
    }
}
