package com.aiyal.mobibix.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.aiyal.mobibix.core.app.AppState
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.ShopApi
import com.aiyal.mobibix.ui.features.ComingSoonScreen
import com.aiyal.mobibix.ui.features.MoreScreen
import com.aiyal.mobibix.ui.features.home.HomeScreen
import com.aiyal.mobibix.ui.features.jobs.JobListScreen
import com.aiyal.mobibix.ui.features.sales.SalesListScreen
import com.aiyal.mobibix.ui.features.staff.StaffScreen

@Composable
fun MainScreen(
    mainNavController: NavHostController,
    appState: AppState,
    shopContextProvider: ShopContextProvider,
    shopApi: ShopApi
) {
    LaunchedEffect(appState) {
        if (appState is AppState.Staff) {
             shopContextProvider.updateShopId(appState.shopId)
        }
    }

    val nestedNavController = rememberNavController()

    Scaffold(
        bottomBar = { AppBottomNavigationBar(navController = nestedNavController) }
    ) {
        NavHost(
            navController = nestedNavController,
            startDestination = BottomNavItem.Home.route,
            modifier = Modifier.padding(it)
        ) {
            composable(BottomNavItem.Home.route) {
                HomeScreen(
                    appState = appState,
                    navController = mainNavController
                )
            }
            composable(BottomNavItem.Sales.route) {
                SalesListScreen(
                    shopContextProvider = shopContextProvider,
                    shopApi = shopApi,
                    onNewSale = { mainNavController.navigate("new_sale") },
                    onInvoiceClick = { invoiceId -> mainNavController.navigate("invoice_details/$invoiceId") }
                )
            }
            composable(BottomNavItem.Repair.route) {
                val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState()
                JobListScreen(
                    isOwner = appState is AppState.Owner,
                    navController = mainNavController,
                    shopId = activeShopId ?: ""
                )
            }
            composable(BottomNavItem.Inventory.route) {
                com.aiyal.mobibix.ui.features.products.ProductListScreen(
                    navController = mainNavController
                )
            }
            composable(BottomNavItem.More.route) {
                MoreScreen(
                    onNavigateToReports = { mainNavController.navigate("reports") },
                    onNavigateToFinance = { mainNavController.navigate("finance") },
                    onNavigateToWhatsApp = { mainNavController.navigate("whatsapp_dashboard") },
                    onNavigateToLoyalty = { mainNavController.navigate("loyalty") },
                    onNavigateToBilling = { mainNavController.navigate("billing") },
                    onNavigateToCustomers = { mainNavController.navigate("customers") },
                    onNavigateToStaff = { mainNavController.navigate("staff") },
                    onNavigateToShopSettings = { mainNavController.navigate("shop_management") },
                    onNavigateToJobCardSettings = { mainNavController.navigate("job_card_settings") },
                    onNavigateToInvoiceSettings = { mainNavController.navigate("invoice_settings") },
                    onLogout = {
                        mainNavController.navigate("login") {
                            popUpTo("home") { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}
