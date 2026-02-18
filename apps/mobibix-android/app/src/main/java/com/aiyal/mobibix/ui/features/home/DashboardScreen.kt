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
    when (appState) {
        is AppState.Owner -> {
            LaunchedEffect(Unit) { 
                viewModel.loadOwnerDashboard(shopId = null)
            }
            OwnerDashboardScreen(
                state = viewModel.ownerState.value,
                onShopSelected = { shopId -> viewModel.loadOwnerDashboard(shopId) },
                onNavigateToJobs = { /* navController.navigate("job_list") */ onNavigateToJobs() }, // Reverted to original parameter, assuming navController is not in scope here.
                onNavigateToInventory = { /* TODO: Navigate to inventory */ onNavigateToInventory() }, // Reverted to original parameter
                onNavigateToNewSale = { /* TODO: Navigate to new sale */ onNavigateToNewSale() }, // Reverted to original parameter
                onNavigateToNewPurchase = { /* TODO: Navigate to new purchase */ onNavigateToNewPurchase() } // Reverted to original parameter
            )
        }

        is AppState.Staff -> {
            LaunchedEffect(appState.shopId) {
                viewModel.loadStaffDashboard()
            }
            // The onLogout parameter is removed as it's no longer needed.
            StaffDashboardScreen(
                state = viewModel.staffState.value
            )
        }

        else -> {
            // Handle other states
        }
    }
}
