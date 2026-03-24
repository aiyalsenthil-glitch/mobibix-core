package com.aiyal.mobibix.ui.navigation

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
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

    val configuration = LocalConfiguration.current
    val useNavigationRail = configuration.screenWidthDp >= 600

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

    val navBackStackEntry by nestedNavController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val subscriptionTopBar: @Composable () -> Unit = {
        val currentPlan = billingState.currentPlan
        if (currentPlan != null) {
            SubscriptionAlertBanner(
                status = currentPlan.subscriptionStatus,
                daysLeft = currentPlan.daysLeft,
                onClick = { mainNavController.navigate("billing") }
            )
        }
    }

    val navHostContent: @Composable (PaddingValues) -> Unit = { padding ->
        NavHost(
            navController = nestedNavController,
            startDestination = BottomNavItem.Home.route,
            modifier = Modifier.padding(padding)
        ) {
            composable(BottomNavItem.Home.route) {
                HomeScreen(
                    appState = appState,
                    navController = mainNavController,
                    onOpenDrawer = { scope.launch { drawerState.open() } },
                    onNavigateToJobs = {
                        nestedNavController.navigate(BottomNavItem.Repair.route) {
                            nestedNavController.graph.startDestinationRoute?.let { route ->
                                popUpTo(route) { saveState = true }
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onNavigateToInventory = {
                        nestedNavController.navigate(BottomNavItem.Inventory.route) {
                            nestedNavController.graph.startDestinationRoute?.let { route ->
                                popUpTo(route) { saveState = true }
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onNavigateToNegativeStock = {
                        mainNavController.navigate("negative_stock")
                    }
                )
            }
            composable(BottomNavItem.Sales.route) {
                val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState()
                SalesListScreen(
                    shopContextProvider = shopContextProvider,
                    shopApi = shopApi,
                    onNewSale = { mainNavController.navigate("new_sale") },
                    onInvoiceClick = { invoiceId ->
                        mainNavController.navigate("invoice_details/${activeShopId ?: ""}/$invoiceId")
                    }
                )
            }
            composable(BottomNavItem.Repair.route) {
                val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState()
                val isSystemOwner = when (appState) {
                    is AppState.Owner -> appState.isSystemOwner
                    is AppState.Staff -> appState.isSystemOwner
                    else -> false
                }
                JobListScreen(
                    isOwner = isSystemOwner,
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

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = drawerState.isOpen,
        drawerContent = {
            AppDrawerContent(
                currentRoute = currentRoute,
                appState = appState,
                onItemClick = { route ->
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
        if (useNavigationRail) {
            Row(modifier = Modifier.fillMaxSize()) {
                AppNavigationRail(
                    navController = nestedNavController,
                    onOpenDrawer = { scope.launch { drawerState.open() } }
                )
                Scaffold(topBar = subscriptionTopBar) { padding ->
                    navHostContent(padding)
                }
            }
        } else {
            Scaffold(
                topBar = subscriptionTopBar,
                bottomBar = { AppBottomNavigationBar(navController = nestedNavController) }
            ) { padding ->
                navHostContent(padding)
            }
        }
    }
}
