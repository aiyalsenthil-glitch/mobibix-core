package com.aiyal.mobibix.ui.features.home

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.core.app.AppState

@Composable
fun HomeScreen(
    appState: AppState,
    navController: NavController,
    onOpenDrawer: () -> Unit = {},
    onNavigateToJobs: () -> Unit = {},
    onNavigateToInventory: () -> Unit = {},
    onNavigateToNegativeStock: () -> Unit = {},
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val isSystemOwner = when(appState) {
        is AppState.Owner -> appState.isSystemOwner
        is AppState.Staff -> appState.isSystemOwner
        else -> false
    }

    if (isSystemOwner) {
        LaunchedEffect(Unit) {
            viewModel.loadShops()
            viewModel.loadOwnerDashboard(shopId = null)
        }
        OwnerDashboardScreen(
            state = viewModel.ownerState.value,
            onShopSelected = { shopId -> viewModel.loadOwnerDashboard(shopId) },
            onNavigateToJobs = onNavigateToJobs,
            onNavigateToInventory = onNavigateToInventory,
            onNavigateToNegativeStock = onNavigateToNegativeStock,
            onNavigateToNewSale = { /* TODO: Navigate to new sale */ },
            onNavigateToNewPurchase = { /* TODO: Navigate to new purchase */ },
            onNavigateToReports = { navController.navigate("reports") },
            onOpenDrawer = onOpenDrawer
        )
    } else if (appState is AppState.Staff) {
        LaunchedEffect(appState.shopId) {
            viewModel.loadStaffDashboard()
        }
        StaffDashboardScreen(
            state = viewModel.staffState.value,
            onOpenDrawer = onOpenDrawer
        )
    } else {
        /* Handle other states */
    }
}
