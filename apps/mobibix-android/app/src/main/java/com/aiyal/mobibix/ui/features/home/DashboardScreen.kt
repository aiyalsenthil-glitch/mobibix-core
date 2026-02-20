package com.aiyal.mobibix.ui.features.home

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiyal.mobibix.core.app.AppState

@Composable
fun DashboardScreen(
    appState: AppState,
    onNavigateToJobs: () -> Unit,
    onNavigateToInventory: () -> Unit,
    onNavigateToNewSale: () -> Unit,
    onNavigateToNewPurchase: () -> Unit,
    viewModel: DashboardViewModel = hiltViewModel()
) {
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
            onNavigateToJobs = onNavigateToJobs,
            onNavigateToInventory = onNavigateToInventory,
            onNavigateToNewSale = onNavigateToNewSale,
            onNavigateToNewPurchase = onNavigateToNewPurchase,
            onNavigateToReports = {},
            onOpenDrawer = {}
        )
    } else if (appState is AppState.Staff) {
        LaunchedEffect(appState.shopId) {
            viewModel.loadStaffDashboard()
        }
        // The onLogout parameter is removed as it's no longer needed.
        StaffDashboardScreen(
            state = viewModel.staffState.value
        )
    } else {
        // Handle other states
    }
}
