package com.aiyal.mobibix.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.ui.graphics.vector.ImageVector

sealed class BottomNavItem(val route: String, val icon: ImageVector, val label: String) {
    object Home : BottomNavItem("home_dashboard", Icons.Default.Home, "Home")
    object Calendar : BottomNavItem("calendar", Icons.Default.ReceiptLong, "Sales")
    object Tools : BottomNavItem("tools", Icons.Default.Build, "Jobcards")
    object Billing : BottomNavItem("billing", Icons.Default.AccountBalanceWallet, "Billing")
}
