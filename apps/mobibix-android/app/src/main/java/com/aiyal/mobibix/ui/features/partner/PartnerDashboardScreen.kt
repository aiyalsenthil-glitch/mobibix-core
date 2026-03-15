package com.aiyal.mobibix.ui.features.partner

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.PartnerDashboardStats

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PartnerDashboardScreen(
    navController: NavController,
    viewModel: PartnerViewModel = hiltViewModel()
) {
    val authState by viewModel.authState.collectAsState()
    val dashState by viewModel.dashboardState.collectAsState()
    var activeTab by remember { mutableIntStateOf(0) }
    val colorScheme = MaterialTheme.colorScheme

    LaunchedEffect(Unit) { viewModel.loadDashboard() }

    // If not logged in, redirect to login
    LaunchedEffect(authState.token) {
        if (authState.token == null) {
            navController.navigate("partner_login") { popUpTo("partner_dashboard") { inclusive = true } }
        }
    }

    val tierColor = when (authState.profile?.tier) {
        "GOLD" -> Color(0xFFD4AF37)
        "SILVER" -> Color(0xFFC0C0C0)
        "PLATINUM" -> Color(0xFF8B5CF6)
        else -> Color(0xFFCD7F32) // Bronze
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Partner Dashboard", fontWeight = FontWeight.Bold)
                        authState.profile?.let { p ->
                            Text("${p.name} · ${p.tier}", fontSize = 11.sp, color = tierColor)
                        }
                    }
                },
                actions = {
                    IconButton(onClick = {
                        viewModel.logout()
                        navController.navigate("partner_login") { popUpTo(0) }
                    }) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Logout", tint = colorScheme.error)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = colorScheme.surface)
            )
        }
    ) { padding ->
        when {
            dashState.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = colorScheme.primary)
            }
            dashState.error != null -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(dashState.error!!, color = colorScheme.error)
                    Spacer(Modifier.height(8.dp))
                    Button(onClick = { viewModel.loadDashboard() }) { Text("Retry") }
                }
            }
            else -> Column(modifier = Modifier.padding(padding)) {
                TabRow(selectedTabIndex = activeTab, containerColor = colorScheme.surface) {
                    Tab(selected = activeTab == 0, onClick = { activeTab = 0 }, text = { Text("Overview") })
                    Tab(selected = activeTab == 1, onClick = { activeTab = 1 }, text = { Text("Referrals") })
                    Tab(selected = activeTab == 2, onClick = { activeTab = 2 }, text = { Text("Payouts") })
                    Tab(selected = activeTab == 3, onClick = { activeTab = 3 }, text = { Text("Tiers") })
                }

                when (activeTab) {
                    0 -> PartnerOverviewTab(dashState.stats, authState.profile?.tier, tierColor)
                    1 -> PartnerReferralsTab(dashState.referrals)
                    2 -> PartnerPayoutsTab(dashState.payouts)
                    3 -> PartnerTiersTab(dashState.tierInfo, authState.profile?.tier)
                }
            }
        }
    }
}

@Composable
private fun PartnerOverviewTab(stats: PartnerDashboardStats?, tier: String?, tierColor: Color) {
    val colorScheme = MaterialTheme.colorScheme
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Tier banner
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Brush.horizontalGradient(listOf(tierColor.copy(alpha = 0.3f), tierColor.copy(alpha = 0.1f))))
                    .padding(16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(modifier = Modifier.size(44.dp).clip(CircleShape).background(tierColor), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Stars, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
                    }
                    Column {
                        Text("${tier ?: "BRONZE"} Partner", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = tierColor)
                        Text("Commission: ${String.format("%.1f", stats?.conversionRate ?: 0.0)}%", fontSize = 12.sp, color = colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        stats?.let { s ->
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard("Total Earnings", "₹${String.format("%.2f", s.totalEarnings)}", Icons.Default.AccountBalanceWallet, colorScheme.primary, modifier = Modifier.weight(1f))
                    StatCard("This Month", "₹${String.format("%.2f", s.thisMonthEarnings)}", Icons.Default.TrendingUp, Color(0xFF00C896), modifier = Modifier.weight(1f))
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard("Total Referrals", "${s.totalReferrals}", Icons.Default.People, Color(0xFF3B82F6), modifier = Modifier.weight(1f))
                    StatCard("Active", "${s.activeReferrals}", Icons.Default.CheckCircle, Color(0xFF00C896), modifier = Modifier.weight(1f))
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard("Pending", "₹${String.format("%.2f", s.pendingEarnings)}", Icons.Default.Pending, Color(0xFFF59E0B), modifier = Modifier.weight(1f))
                    StatCard("Paid Out", "₹${String.format("%.2f", s.paidEarnings)}", Icons.Default.Paid, Color(0xFF6B7280), modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, icon: ImageVector, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.08f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
            Text(value, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
            Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun PartnerReferralsTab(referrals: List<com.aiyal.mobibix.data.network.PartnerReferral>) {
    if (referrals.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.People, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
                Spacer(Modifier.height(8.dp))
                Text("No referrals yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("Share your referral code to start earning", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
            }
        }
    } else {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(referrals) { ref ->
                val statusColor = when (ref.status) {
                    "ACTIVE" -> Color(0xFF00C896)
                    "PENDING" -> Color(0xFFF59E0B)
                    "CANCELLED" -> MaterialTheme.colorScheme.error
                    else -> MaterialTheme.colorScheme.onSurfaceVariant
                }
                Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)) {
                    Row(modifier = Modifier.padding(14.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(ref.businessName, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                            if (ref.planName != null) Text(ref.planName, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(ref.createdAt.take(10), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
                        }
                        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Surface(shape = RoundedCornerShape(20.dp), color = statusColor.copy(alpha = 0.12f)) {
                                Text(ref.status, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp), fontSize = 10.sp, color = statusColor, fontWeight = FontWeight.SemiBold)
                            }
                            if (ref.commissionAmount > 0) Text("₹${String.format("%.2f", ref.commissionAmount)}", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF00C896))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PartnerPayoutsTab(payouts: List<com.aiyal.mobibix.data.network.PartnerPayoutHistory>) {
    if (payouts.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No payouts yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    } else {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(payouts) { payout ->
                Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)) {
                    Row(modifier = Modifier.padding(14.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column {
                            Text(payout.month, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                            if (payout.paidAt != null) Text("Paid: ${payout.paidAt.take(10)}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("₹${String.format("%.2f", payout.amount)}", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF00C896))
                            val statusColor = if (payout.status == "PAID") Color(0xFF00C896) else Color(0xFFF59E0B)
                            Text(payout.status, fontSize = 11.sp, color = statusColor, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PartnerTiersTab(tiers: List<com.aiyal.mobibix.data.network.PartnerTierInfo>, currentTier: String?) {
    val tierColors = mapOf("BRONZE" to Color(0xFFCD7F32), "SILVER" to Color(0xFFC0C0C0), "GOLD" to Color(0xFFD4AF37), "PLATINUM" to Color(0xFF8B5CF6))
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (tiers.isEmpty()) {
            item { Text("Tier information not available", color = MaterialTheme.colorScheme.onSurfaceVariant) }
        } else {
            items(tiers) { tier ->
                val color = tierColors[tier.tier] ?: MaterialTheme.colorScheme.primary
                val isActive = tier.tier == currentTier
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = if (isActive) color.copy(alpha = 0.1f) else MaterialTheme.colorScheme.surface),
                    border = if (isActive) CardDefaults.outlinedCardBorder() else null,
                    elevation = CardDefaults.cardElevation(defaultElevation = if (isActive) 4.dp else 1.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Icon(Icons.Default.Stars, contentDescription = null, tint = color, modifier = Modifier.size(24.dp))
                            Text(tier.tier, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = color)
                            if (isActive) Surface(shape = RoundedCornerShape(20.dp), color = color.copy(alpha = 0.2f)) {
                                Text("CURRENT", modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), fontSize = 9.sp, fontWeight = FontWeight.Bold, color = color)
                            }
                        }
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("Min. Referrals", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("${tier.minReferrals}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("Commission Rate", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("${String.format("%.1f", tier.commissionRate)}%", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = color)
                        }
                        if (tier.perks.isNotEmpty()) {
                            HorizontalDivider()
                            tier.perks.forEach { perk ->
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = color, modifier = Modifier.size(14.dp))
                                    Text(perk, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
