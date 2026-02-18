package com.aiyal.mobibix.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.ui.graphics.vector.ImageVector

sealed class BottomNavItem(val route: String, val icon: ImageVector, val label: String) {
    object Home : BottomNavItem("home_dashboard", Icons.Default.Home, "Home")
    object Sales : BottomNavItem("sales", Icons.AutoMirrored.Filled.ReceiptLong, "Sales")
    object Repair : BottomNavItem("repair", Icons.Default.Build, "Repair")
    object Inventory : BottomNavItem("inventory", Icons.Default.Inventory, "Inventory")
    object More : BottomNavItem("more", Icons.Default.MoreHoriz, "More")
}
