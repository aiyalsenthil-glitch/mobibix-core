package com.aiyal.mobibix.ui.features.home

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.core.app.AppState

@Composable
fun DashboardRoute(
    appState: AppState,
    navController: NavController, // For navigation actions
    onNavigateToJobs: () -> Unit = {},
    onNavigateToInventory: () -> Unit = {},
    onNavigateToNegativeStock: () -> Unit = {},
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val onLogout = {
        navController.navigate("login") {
            popUpTo("home") { inclusive = true }
        }
    }

    val isSystemOwner = when(appState) {
        is AppState.Owner -> appState.isSystemOwner
        is AppState.Staff -> appState.isSystemOwner
        else -> false
    }

    if (isSystemOwner) {
        LaunchedEffect(Unit) {
            viewModel.loadOwnerDashboard(shopId = null)
        }
        OwnerDashboardScreen(
            state = viewModel.ownerState.value,
            onShopSelected = { shopId -> viewModel.loadOwnerDashboard(shopId) },
            // onLogout is handled by the main Scaffold's TopBar now
            onNavigateToJobs = onNavigateToJobs,
            onNavigateToInventory = onNavigateToInventory,
            onNavigateToNegativeStock = onNavigateToNegativeStock,
            // onNavigateToStaff is handled by the 'More' tab now
            onNavigateToNewSale = { navController.navigate("new_sale") },
            onNavigateToNewPurchase = { navController.navigate("create_purchase") }
        )
    } else if (appState is AppState.Staff) {
        LaunchedEffect(appState.shopId) {
            viewModel.loadStaffDashboard()
        }
        StaffDashboardScreen(
            state = viewModel.staffState.value
            // onLogout parameter removed as it's no longer needed
        )
    } else {
        // Handle other states
    }
}
