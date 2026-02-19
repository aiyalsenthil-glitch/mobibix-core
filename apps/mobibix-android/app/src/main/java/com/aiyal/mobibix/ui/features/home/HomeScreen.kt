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
    viewModel: DashboardViewModel = hiltViewModel()
) {
    when (appState) {
        is AppState.Owner -> {
            LaunchedEffect(Unit) {
                viewModel.loadShops()
                viewModel.loadOwnerDashboard(shopId = null)
            }
            OwnerDashboardScreen(
                state = viewModel.ownerState.value,
                onShopSelected = { shopId -> viewModel.loadOwnerDashboard(shopId) },
                onNavigateToJobs = { navController.navigate("job_list") },
                onNavigateToInventory = { /* TODO: Navigate to inventory */ },
                onNavigateToNewSale = { /* TODO: Navigate to new sale */ },
                onNavigateToNewPurchase = { /* TODO: Navigate to new purchase */ },
                onNavigateToReports = { navController.navigate("reports") },
                onOpenDrawer = onOpenDrawer
            )
        }
        is AppState.Staff -> {
            LaunchedEffect(appState.shopId) {
                viewModel.loadStaffDashboard()
            }
            StaffDashboardScreen(
                state = viewModel.staffState.value,
                onOpenDrawer = onOpenDrawer
            )
        }
        else -> { /* Handle other states if necessary */ }
    }
}
