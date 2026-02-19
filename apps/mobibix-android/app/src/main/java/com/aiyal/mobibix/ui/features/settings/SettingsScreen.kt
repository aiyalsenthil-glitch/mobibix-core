package com.aiyal.mobibix.ui.features.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.ui.theme.ThemeState

private val TealAccent = Color(0xFF00C896)

@Composable
fun SettingsScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider
) {
    val activeShopId = shopContextProvider.getActiveShopId() ?: ""
    val themeState = ThemeState.current
    var isDarkTheme by remember { mutableStateOf(themeState.isDarkTheme) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // ── Premium Header ──
        Surface(color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                Text("Settings", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text("Configure app, business, and invoicing", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // ── Appearance Section ──
            item {
                SettingsSectionHeader("Appearance")
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    if (isDarkTheme) Icons.Default.DarkMode else Icons.Default.LightMode,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Dark Mode", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Text("Adjust app appearance", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Switch(
                            checked = isDarkTheme,
                            onCheckedChange = { 
                                isDarkTheme = it 
                                themeState.toggleTheme()
                            }
                        )
                    }
                }
            }

            // ── Business Settings Section ──
            item {
                SettingsSectionHeader("Business Configuration")
                if (activeShopId.isNotBlank()) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        SettingsOptionCard(
                            title = "Shop Settings",
                            subtitle = "Name, address, contact details",
                            icon = Icons.Default.Store,
                            color = Color(0xFF3B82F6),
                            onClick = { navController.navigate("shop_settings/$activeShopId") }
                        )
                        SettingsOptionCard(
                            title = "Invoice Settings",
                            subtitle = "GST, prefixes, footer notes",
                            icon = Icons.Default.Description,
                            color = TealAccent,
                            onClick = { navController.navigate("invoice_settings") }
                        )
                        SettingsOptionCard(
                            title = "Job Card Settings",
                            subtitle = "Terms & conditions for repair",
                            icon = Icons.Default.Build,
                            color = Color(0xFF8B5CF6),
                            onClick = { navController.navigate("job_card_settings") }
                        )
                    }
                } else {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            "No active shop selected. Please create or select a shop.",
                            modifier = Modifier.padding(16.dp),
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
            }

            // ── Subscription Section ──
            item {
                SettingsSectionHeader("Subscription & Billing")
                SettingsOptionCard(
                    title = "My Plan",
                    subtitle = "Manage subscription and payments",
                    icon = Icons.Default.CreditCard,
                    color = Color(0xFFF59E0B),
                    onClick = { navController.navigate("billing") }
                )
            }
        }
    }
}

@Composable
fun SettingsSectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(bottom = 8.dp, start = 4.dp)
    )
}

@Composable
fun SettingsOptionCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    color: Color,
    onClick: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.clickable(onClick = onClick).fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = color.copy(alpha = 0.12f),
                modifier = Modifier.size(36.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
                }
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
