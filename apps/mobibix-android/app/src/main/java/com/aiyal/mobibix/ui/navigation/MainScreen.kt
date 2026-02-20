package com.aiyal.mobibix.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.aiyal.mobibix.core.app.AppState
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.ShopApi
import com.aiyal.mobibix.ui.features.MoreViewModel
import com.aiyal.mobibix.ui.features.home.HomeScreen
import com.aiyal.mobibix.ui.features.jobs.JobListScreen
import com.aiyal.mobibix.ui.features.sales.SalesListScreen
import com.aiyal.mobibix.ui.features.billing.BillingViewModel
import com.aiyal.mobibix.data.network.SubscriptionDetails
import com.aiyal.mobibix.ui.components.SubscriptionAlertBanner
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
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
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val moreViewModel: MoreViewModel = hiltViewModel()
    val billingViewModel: BillingViewModel = hiltViewModel()
    val logoutComplete by moreViewModel.logoutComplete.collectAsState()
    val billingState by billingViewModel.uiState.collectAsState()
    
    LaunchedEffect(Unit) {
        billingViewModel.loadData()
    }

    LaunchedEffect(logoutComplete) {
        if (logoutComplete) {
            moreViewModel.resetLogoutState()
            mainNavController.navigate("login") {
                popUpTo("home") { inclusive = true }
            }
        }
    }

    // Get current route for drawer highlight
    val navBackStackEntry by nestedNavController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = drawerState.isOpen,
        drawerContent = {
            AppDrawerContent(
                currentRoute = currentRoute,
                onItemClick = { route ->
                    // Navigate via mainNavController for most items
                    mainNavController.navigate(route) {
                        launchSingleTop = true
                    }
                    scope.launch { drawerState.close() }
                },
                onLogout = {
                    scope.launch { drawerState.close() }
                    moreViewModel.logout()
                },
                onClose = {
                    scope.launch { drawerState.close() }
                }
            )
        }
    ) {
        Scaffold(
            topBar = {
                val currentPlan = billingState.currentPlan
                if (currentPlan != null) {
                    SubscriptionAlertBanner(
                        status = currentPlan.subscriptionStatus,
                        daysLeft = currentPlan.daysLeft,
                        onClick = { mainNavController.navigate("billing") }
                    )
                }
            },
            bottomBar = { AppBottomNavigationBar(navController = nestedNavController) }
        ) { padding ->
            NavHost(
                navController = nestedNavController,
                startDestination = BottomNavItem.Home.route,
                modifier = Modifier.padding(padding)
            ) {
                composable(BottomNavItem.Home.route) {
                    HomeScreen(
                        appState = appState,
                        navController = mainNavController,
                        onOpenDrawer = { scope.launch { drawerState.open() } }
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
            }
        }
    }
}
