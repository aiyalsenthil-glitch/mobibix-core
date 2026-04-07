package com.aiyal.mobibix.ui.navigation

import androidx.compose.foundation.layout.Spacer
import androidx.compose.ui.Modifier
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState

@Composable
fun AppNavigationRail(
    navController: NavController,
    onOpenDrawer: () -> Unit
) {
    val items = listOf(
        BottomNavItem.Home,
        BottomNavItem.Calendar,
        BottomNavItem.Tools,
        BottomNavItem.Billing
    )
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    NavigationRail(
        containerColor = MaterialTheme.colorScheme.surface,
        header = {
            IconButton(onClick = onOpenDrawer) {
                Icon(Icons.Default.Menu, contentDescription = "Menu")
            }
        }
    ) {
        Spacer(Modifier.weight(1f))
        items.forEach { item ->
            val selected = currentRoute == item.route
            NavigationRailItem(
                selected = selected,
                onClick = {
                    navController.navigate(item.route) {
                        navController.graph.startDestinationRoute?.let { route ->
                            popUpTo(route) { saveState = true }
                        }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                icon = { Icon(item.icon, contentDescription = item.label) },
                label = {
                    Text(
                        item.label,
                        fontSize = 11.sp,
                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal
                    )
                },
                colors = NavigationRailItemDefaults.colors(
                    selectedIconColor = Color(0xFF00C896),
                    selectedTextColor = Color(0xFF00C896),
                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    indicatorColor = Color(0xFF00C896).copy(alpha = 0.12f)
                )
            )
        }
        Spacer(Modifier.weight(1f))
    }
}
