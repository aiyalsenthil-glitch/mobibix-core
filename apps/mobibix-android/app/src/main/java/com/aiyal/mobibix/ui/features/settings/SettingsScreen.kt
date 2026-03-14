package com.aiyal.mobibix.ui.features.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import android.content.Intent
import android.net.Uri
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.ui.theme.ThemeState
import com.aiyal.mobibix.ui.components.AuroraBackground
import com.aiyal.mobibix.ui.components.GlassCard

@Composable
fun SettingsScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    isOwner: Boolean = false
) {
    val activeShopId = shopContextProvider.getActiveShopId() ?: ""
    val isSystemDark = isSystemInDarkTheme()
    val isDarkTheme = ThemeState.isDarkMode ?: isSystemDark

    Box(
        modifier = Modifier.fillMaxSize()
    ) {
        AuroraBackground()
        
        Column(modifier = Modifier.fillMaxSize()) {
            // ── Header ──
            Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 24.dp)) {
                Text(
                    "Settings",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    "Configure app, business, and invoicing",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Medium
                )
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                // ── Appearance Section ──
                item {
                    SettingsSectionHeader("Appearance")
                    GlassCard {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                                modifier = Modifier.size(40.dp)
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
                                Text("Dark Mode", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                                Text("Adjust app appearance", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
                            }
                            Switch(
                                checked = isDarkTheme,
                                onCheckedChange = { 
                                    ThemeState.isDarkMode = it 
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
                                color = Color(0xFF14B8A6),
                                onClick = { navController.navigate("invoice_settings") }
                            )
                            SettingsOptionCard(
                                title = "Job Card Settings",
                                subtitle = "Terms & conditions for repair",
                                icon = Icons.Default.Build,
                                color = Color(0xFF8B5CF6),
                                onClick = { navController.navigate("job_card_settings") }
                            )
                            SettingsOptionCard(
                                title = "Loyalty Settings",
                                subtitle = "Configure loyalty points and rewards",
                                icon = Icons.Default.Star,
                                color = Color(0xFFEC4899),
                                onClick = { navController.navigate("loyalty_settings") }
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
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                fontWeight = FontWeight.Bold
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

                // ── Legal & Privacy Section ──
                item {
                    val context = LocalContext.current
                    SettingsSectionHeader("Legal & Privacy")
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        SettingsOptionCard(
                            title = "Terms of Service",
                            subtitle = "Read our service agreement",
                            icon = Icons.Default.Description,
                            color = Color(0xFF64748B),
                            onClick = {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://REMOVED_DOMAIN/terms"))
                                context.startActivity(intent)
                            }
                        )
                        SettingsOptionCard(
                            title = "Privacy Policy",
                            subtitle = "How we handle your data",
                            icon = Icons.Default.Shield,
                            color = Color(0xFF64748B),
                            onClick = {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://REMOVED_DOMAIN/privacy"))
                                context.startActivity(intent)
                            }
                        )
                        SettingsOptionCard(
                            title = "Data Deletion",
                            subtitle = if (isOwner) "Account removal procedures" else "Contact owner to delete account",
                            icon = Icons.Default.Delete,
                            color = if (isOwner) Color(0xFFEF4444) else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                            onClick = {
                                if (isOwner) {
                                    navController.navigate("delete_account")
                                } else {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://REMOVED_DOMAIN/data-deletion"))
                                    context.startActivity(intent)
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsSectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.ExtraBold,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(bottom = 8.dp, start = 4.dp),
        letterSpacing = 0.5.sp
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
    GlassCard(
        modifier = Modifier.clickable(onClick = onClick).fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = color.copy(alpha = 0.15f),
                modifier = Modifier.size(40.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
                }
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
