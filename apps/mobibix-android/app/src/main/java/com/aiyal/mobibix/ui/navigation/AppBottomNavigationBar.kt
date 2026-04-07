package com.aiyal.mobibix.ui.navigation

import androidx.compose.foundation.*
import androidx.compose.foundation.interaction.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState

@Composable
fun AppBottomNavigationBar(navController: NavController) {
    val items = listOf(
        BottomNavItem.Home,
        BottomNavItem.Calendar,
        BottomNavItem.Tools,
        BottomNavItem.Billing
    )

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val colorScheme = MaterialTheme.colorScheme

    // Full-width flat bottom bar anchored to the bottom
    Surface(
        color = Color.White,
        tonalElevation = 0.dp,
        shadowElevation = 0.dp, // No heavy shadow
        border = BorderStroke(0.5.dp, colorScheme.outlineVariant.copy(alpha = 0.2f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .height(72.dp)
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            items.forEach { item ->
                val selected = currentRoute == item.route
                
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {
                            navController.navigate(item.route) {
                                navController.graph.startDestinationRoute?.let { route ->
                                    popUpTo(route) { saveState = true }
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                        .padding(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    Icon(
                        item.icon,
                        contentDescription = item.label,
                        modifier = Modifier.size(24.dp),
                        tint = if (selected) colorScheme.primary else colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        item.label,
                        fontSize = 11.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                        color = if (selected) colorScheme.primary else colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                        letterSpacing = 0.1.sp
                    )
                }
            }
        }
    }
}
