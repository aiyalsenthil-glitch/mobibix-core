package com.aiyal.mobibix.ui.navigation

import android.content.Intent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.runtime.collectAsState
import com.aiyal.mobibix.core.ui.UiMessageType
import kotlinx.coroutines.launch
import com.aiyal.mobibix.core.app.AppState
import com.aiyal.mobibix.core.auth.AuthEntryPoint
import com.aiyal.mobibix.ui.features.finance.FinanceLandingScreen
import com.aiyal.mobibix.ui.features.finance.purchases.CreatePurchaseScreen
import com.aiyal.mobibix.ui.features.finance.purchases.PurchaseDetailScreen
import com.aiyal.mobibix.ui.features.finance.purchases.PurchaseListScreen
import com.aiyal.mobibix.ui.features.finance.receipts.CreateReceiptScreen
import com.aiyal.mobibix.ui.features.finance.receipts.ReceiptListScreen
import com.aiyal.mobibix.ui.features.finance.vouchers.CreateVoucherScreen
import com.aiyal.mobibix.ui.features.finance.vouchers.VoucherListScreen
import com.aiyal.mobibix.ui.features.finance.purchases.GRNListScreen
import com.aiyal.mobibix.ui.features.finance.purchases.GRNDetailScreen
import com.aiyal.mobibix.ui.features.finance.ewaybill.EWayBillScreen
import com.aiyal.mobibix.ui.features.commission.CommissionScreen
import com.aiyal.mobibix.ui.features.intelligence.DemandForecastScreen
import com.aiyal.mobibix.ui.features.ComingSoonScreen
import com.aiyal.mobibix.ui.features.login.GoogleSignInViewModel
import com.aiyal.mobibix.ui.features.login.AuthScreen
import com.aiyal.mobibix.ui.features.login.SignInViewModel
import com.aiyal.mobibix.ui.features.onboarding.TenantRequiredScreen
import com.aiyal.mobibix.ui.features.sales.InvoiceDetailsScreen
import com.aiyal.mobibix.ui.features.sales.InvoicePrintPreviewScreen
import com.aiyal.mobibix.ui.features.sales.NewSaleScreen
import com.aiyal.mobibix.ui.features.shop.CreateShopScreen
import com.aiyal.mobibix.ui.features.shop.InvoiceSettingsScreen
import com.aiyal.mobibix.ui.features.shop.JobCardSettingsScreen
import com.aiyal.mobibix.ui.features.shop.ShopEntryPoint
import com.aiyal.mobibix.ui.features.shop.ShopManagementScreen
import com.aiyal.mobibix.ui.features.shop.ShopSettingsScreen
import com.aiyal.mobibix.ui.features.staff.InviteStaffScreen
import com.aiyal.mobibix.ui.features.staff.StaffEntryPoint
import com.aiyal.mobibix.ui.features.staff.StaffScreen
import dagger.hilt.android.EntryPointAccessors

@Composable
fun AppNavGraph(
    navController: NavHostController = rememberNavController(),
) {
    val context = LocalContext.current
    val authEntryPoint = EntryPointAccessors.fromApplication(context, AuthEntryPoint::class.java)
    val shopEntryPoint = EntryPointAccessors.fromApplication(context, ShopEntryPoint::class.java)
    val staffEntryPoint = EntryPointAccessors.fromApplication(context, StaffEntryPoint::class.java)
    val appStateResolver = authEntryPoint.appStateResolver()
    val authEventBus = authEntryPoint.authEventBus()
    val uiMessageBus = authEntryPoint.uiMessageBus()
    val shopApi = shopEntryPoint.shopApi()
    val shopContextStore = shopEntryPoint.shopContextStore()
    val shopContextProvider = shopEntryPoint.shopContextProvider()
    val staffApi = staffEntryPoint.staffApi()

    val snackbarHostState = remember { SnackbarHostState() }
    val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState()
    val appState by produceState<AppState?>(initialValue = null, activeShopId) {
        value = try { appStateResolver.resolve() } catch (e: Exception) {
            android.util.Log.e("AppNavGraph", "resolve failed: ${e.message}")
            null
        }
    }

    // Global 401 handler
    LaunchedEffect(Unit) {
        authEventBus.unauthorizedEvent.collect {
            navController.navigate("login") {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    // Global error/success snackbar
    LaunchedEffect(Unit) {
        uiMessageBus.messages.collect { msg ->
            snackbarHostState.showSnackbar(msg.text, duration = SnackbarDuration.Short)
        }
    }

    Scaffold(
        snackbarHost = {
            SnackbarHost(snackbarHostState) { data ->
                Snackbar(
                    snackbarData = data,
                    containerColor = Color(0xFF1E1E2E),
                    contentColor = Color.White
                )
            }
        }
    ) { innerPadding ->
    Box(Modifier.fillMaxSize().padding(innerPadding)) {
    NavHost(
        navController = navController,
        startDestination = "login",
        enterTransition = { slideInHorizontally(initialOffsetX = { it }) + fadeIn() },
        exitTransition = { slideOutHorizontally(targetOffsetX = { -it / 3 }) + fadeOut() },
        popEnterTransition = { slideInHorizontally(initialOffsetX = { -it / 3 }) + fadeIn() },
        popExitTransition = { slideOutHorizontally(targetOffsetX = { it }) + fadeOut() }
    ) {

        composable("login") {
            val signInViewModel: SignInViewModel = hiltViewModel()
            val googleSignInViewModel: GoogleSignInViewModel = hiltViewModel()
            val uiState = signInViewModel.uiState.value

            val scope = androidx.compose.runtime.rememberCoroutineScope()

            LaunchedEffect(uiState.loginSuccess) {
                if (uiState.loginSuccess) {
                    navController.navigate("home") {
                        popUpTo(0) { inclusive = true }
                        launchSingleTop = true
                    }
                }
            }

            AuthScreen(
                uiState = uiState,
                onEmailContinue = { email -> 
                    signInViewModel.setEmail(email)
                    signInViewModel.setStep(com.aiyal.mobibix.ui.features.login.AuthStep.LOGIN_PASS)
                },
                onLogin = { password -> signInViewModel.signIn(password) },
                onSignup = { password, fullName -> signInViewModel.signUp(password, fullName) },
                onCheckVerification = { signInViewModel.checkVerification() },
                onResendVerification = { signInViewModel.resendVerification() },
                onGoogleLogin = {
                    scope.launch {
                       googleSignInViewModel.signIn(
                           activityContext = context,
                           onSuccess = { token -> signInViewModel.signInWithGoogle(token) },
                           onError = { error -> signInViewModel.setError(error) }
                       )
                    }
                },
                onBack = { signInViewModel.setStep(com.aiyal.mobibix.ui.features.login.AuthStep.LANDING) }
            )
        }

        composable("home") {

            // Validate shopId against actual shops to fix stale DataStore values
            LaunchedEffect(appState) {
                if (appState is AppState.Staff || appState is AppState.Owner) {
                    try {
                        val myShops = shopApi.getMyShops().data
                        val validIds = myShops.map { it.id }.toSet()
                        val currentId = shopContextProvider.getActiveShopId()
                        if (currentId == null || !validIds.contains(currentId)) {
                            val firstShopId = myShops.firstOrNull()?.id
                            shopContextProvider.updateShopId(firstShopId)
                            if (firstShopId != null) {
                                shopContextStore.setActiveShopId(firstShopId)
                            }
                        }
                    } catch (_: Exception) {
                        // Network error — keep existing shopId
                    }
                }
            }

            appState?.let { state ->
                when (state) {
                    is AppState.ComingSoonBusiness -> LaunchedEffect(state) {
                        navController.navigate("coming_soon_business") { popUpTo(0) }
                    }
                    is AppState.TenantRequired -> LaunchedEffect(state) {
                        navController.navigate("tenant_required") { popUpTo(0) }
                    }
                    is AppState.Distributor -> LaunchedEffect(state) {
                        // Pure distributor — no ERP — go to distributor hub
                        navController.navigate("distributor_dashboard") { popUpTo(0) }
                    }
                    else -> MainScreen(
                        mainNavController = navController,
                        appState = state,
                        shopContextProvider = shopContextProvider,
                        shopApi = shopApi
                    )
                }
            }
        }

        composable("tenant_required") {
            TenantRequiredScreen(navController = navController)
        }

        // ── Distributor Hub (pure distributor — no ERP tenant) ─────────────────
        composable("distributor_dashboard") {
            com.aiyal.mobibix.ui.features.distributor.DistributorDashboardScreen(
                navController = navController,
                onUpgradeToERP = {
                    // Navigate to onboarding/pricing — same as TenantRequiredScreen flow
                    navController.navigate("tenant_required") { popUpTo(0) }
                }
            )
        }

        composable("coming_soon_business") {
            com.aiyal.mobibix.ui.features.onboarding.ComingSoonBusinessScreen(navController = navController)
        }

        composable("create_shop") {
            CreateShopScreen(
                shopApi = shopApi,
                shopContextStore = shopContextStore,
                shopContextProvider = shopContextProvider,
                onShopCreated = { navController.popBackStack() } 
            )
        }

        composable("shop_management") {
            ShopManagementScreen(navController = navController)
        }

        composable(
            route = "shop_settings/{shopId}",
            arguments = listOf(navArgument("shopId") { type = NavType.StringType })
        ) {
            val shopId = it.arguments?.getString("shopId") ?: ""
            ShopSettingsScreen(shopId = shopId, navController = navController, shopApi = shopApi)
        }

        composable("invite_staff") {
            val activeShopId = shopContextProvider.getActiveShopId() ?: ""
            InviteStaffScreen(
                staffApi = staffApi,
                activeShopId = activeShopId,
                onDone = { navController.popBackStack() }
            )
        }
        
        composable("new_sale") {
            val activeShopId = shopContextProvider.getActiveShopId() ?: ""
            NewSaleScreen(
                shopId = activeShopId,
                navController = navController
            )
        }
        
        composable(
            route = "invoice_details/{shopId}/{invoiceId}",
            arguments = listOf(
                navArgument("shopId") { type = NavType.StringType },
                navArgument("invoiceId") { type = NavType.StringType }
            )
        ) {
            val appState by produceState<AppState?>(initialValue = null) {
                value = try { appStateResolver.resolve() } catch (e: Exception) {
                    android.util.Log.e("AppNavGraph", "resolve failed: ${e.message}")
                    null
                }
            }
            val shopId = it.arguments?.getString("shopId") ?: ""
            val invoiceId = it.arguments?.getString("invoiceId") ?: ""
            InvoiceDetailsScreen(
                invoiceId = invoiceId,
                shopId = shopId,
                navController = navController,
                canCancel = appState is AppState.Staff
            )
        }

        composable(
            route = "invoice_print_preview/{invoiceId}/{shopId}?autoShare={autoShare}",
            arguments = listOf(
                navArgument("invoiceId") { type = NavType.StringType },
                navArgument("shopId") { type = NavType.StringType },
                navArgument("autoShare") { type = NavType.BoolType; defaultValue = false }
            )
        ) { backStackEntry ->
            val invoiceId = backStackEntry.arguments?.getString("invoiceId") ?: ""
            val shopId = backStackEntry.arguments?.getString("shopId") ?: ""
            val autoShare = backStackEntry.arguments?.getBoolean("autoShare") ?: false
            InvoicePrintPreviewScreen(invoiceId = invoiceId, shopId = shopId, navController = navController, autoShare = autoShare)
        }
        
        composable("reports") {
            com.aiyal.mobibix.ui.features.reports.ReportsLandingScreen(
                navController = navController
            )
        }

        composable("sales_report") {
            com.aiyal.mobibix.ui.features.reports.SalesReportScreen(
                navController = navController
            )
        }

        composable("repair_report") {
            com.aiyal.mobibix.ui.features.reports.RepairReportScreen(
                navController = navController
            )
        }

        composable("inventory_report") {
            com.aiyal.mobibix.ui.features.reports.InventoryReportScreen(
                navController = navController
            )
        }

        composable("profit_loss_report") {
            com.aiyal.mobibix.ui.features.reports.ProfitLossScreen(
                navController = navController
            )
        }

        composable("tax_report") {
            com.aiyal.mobibix.ui.features.reports.TaxReportScreen(
                navController = navController
            )
        }

        composable("receivables_report") {
            com.aiyal.mobibix.ui.features.reports.OutstandingReportScreen(
                navController = navController,
                reportType = "receivables"
            )
        }

        composable("payables_report") {
            com.aiyal.mobibix.ui.features.reports.OutstandingReportScreen(
                navController = navController,
                reportType = "payables"
            )
        }

        composable("daily_sales_report") {
            com.aiyal.mobibix.ui.features.reports.DailySalesReportScreen(
                navController = navController
            )
        }
        composable("aging_report") {
            com.aiyal.mobibix.ui.features.reports.AgingReportScreen(navController = navController)
        }
        composable("gstr2_report") {
            com.aiyal.mobibix.ui.features.reports.Gstr2ReportScreen(navController = navController)
        }

        composable("staff") {
            StaffScreen(
                navController = navController,
                viewModel = hiltViewModel()
            )
        }

        // ── Roles & Permissions ────────────────────────────────────────────────
        composable("role_list") {
            appState?.let { state ->
                com.aiyal.mobibix.ui.features.roles.RoleListScreen(
                    appState = state,
                    onNavigateBack = { navController.navigateUp() },
                    onNavigateToRoleEdit = { roleId ->
                        if (roleId == null) navController.navigate("role_edit/new")
                        else navController.navigate("role_edit/$roleId")
                    }
                )
            }
        }
        composable(
            route = "role_edit/{roleId}",
            arguments = listOf(navArgument("roleId") { type = NavType.StringType })
        ) { backStackEntry ->
            val rawId = backStackEntry.arguments?.getString("roleId")
            val roleId = if (rawId == "new") null else rawId
            appState?.let { state ->
                com.aiyal.mobibix.ui.features.roles.RoleEditScreen(
                    appState = state,
                    roleId = roleId,
                    onNavigateBack = { navController.navigateUp() }
                )
            }
        }
        composable("job_card_settings") {
            val activeShopId = shopContextProvider.getActiveShopId() ?: ""
            JobCardSettingsScreen(shopId = activeShopId, navController = navController, shopApi = shopApi)
        }
        composable("invoice_settings") {
            val activeShopId = shopContextProvider.getActiveShopId() ?: ""
            InvoiceSettingsScreen(shopId = activeShopId, navController = navController, shopApi = shopApi)
        }

        // Job Routes
        composable("create_job") {
            val activeShopId = shopContextProvider.getActiveShopId() ?: ""
            com.aiyal.mobibix.ui.features.jobs.CreateJobScreen(
                shopId = activeShopId,
                navController = navController
            )
        }
        
        composable(
            route = "job_detail/{jobId}",
            arguments = listOf(navArgument("jobId") { type = NavType.StringType })
        ) {
            val activeShopId = shopContextProvider.getActiveShopId() ?: ""
            val jobId = it.arguments?.getString("jobId") ?: ""
            com.aiyal.mobibix.ui.features.jobs.JobDetailScreen(
                shopId = activeShopId,
                jobId = jobId,
                navController = navController
            )
        }

        composable(
            route = "job_repair_bill/{shopId}/{jobId}",
            arguments = listOf(
                navArgument("shopId") { type = NavType.StringType },
                navArgument("jobId") { type = NavType.StringType }
            )
        ) {
            val shopIdArg = it.arguments?.getString("shopId") ?: ""
            val jobIdArg = it.arguments?.getString("jobId") ?: ""
            com.aiyal.mobibix.ui.features.jobs.RepairBillingScreen(
                shopId = shopIdArg,
                jobId = jobIdArg,
                navController = navController
            )
        }

        composable(
            route = "job_card_print_preview/{shopId}/{jobId}",
            arguments = listOf(
                navArgument("shopId") { type = NavType.StringType },
                navArgument("jobId") { type = NavType.StringType }
            )
        ) {
            val shopIdArg = it.arguments?.getString("shopId") ?: ""
            val jobIdArg = it.arguments?.getString("jobId") ?: ""
            com.aiyal.mobibix.ui.features.jobs.JobCardPrintPreviewScreen(
                shopId = shopIdArg,
                jobId = jobIdArg
            )
        }

        // Inventory Routes
        composable("product_list") {
            com.aiyal.mobibix.ui.features.products.ProductListScreen(
                navController = navController,
                onOpenDrawer = {}
            )
        }

        composable("add_product") {
            com.aiyal.mobibix.ui.features.products.AddEditProductScreen(
                navController = navController
            )
        }

        composable(
            route = "edit_product/{productId}",
            arguments = listOf(navArgument("productId") { type = NavType.StringType })
        ) {
            val productId = it.arguments?.getString("productId") ?: ""
            com.aiyal.mobibix.ui.features.products.AddEditProductScreen(
                navController = navController,
                productId = productId
            )
        }

        composable(
            route = "stock_adjustment/{productId}",
            arguments = listOf(navArgument("productId") { type = NavType.StringType })
        ) {
            val productId = it.arguments?.getString("productId") ?: ""
            com.aiyal.mobibix.ui.features.products.StockAdjustmentScreen(
                navController = navController,
                productId = productId
            )
        }

        composable("barcode_scanner") {
            com.aiyal.mobibix.ui.components.BarcodeScannerScreen(
                onBarcodeScanned = { barcode ->
                    navController.previousBackStackEntry
                        ?.savedStateHandle
                        ?.set("scanned_barcode", barcode)
                    navController.popBackStack()
                }
            )
        }

        // Customer Routes
        composable("customers") {
            com.aiyal.mobibix.ui.features.customers.CustomerListScreen(
                onNavigateToAddCustomer = { navController.navigate("add_customer") },
                onCustomerClick = { customerId -> navController.navigate("customer_detail/$customerId") },
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable(
            route = "customer_detail/{customerId}",
            arguments = listOf(navArgument("customerId") { type = NavType.StringType })
        ) { backStackEntry ->
            val customerId = backStackEntry.arguments?.getString("customerId") ?: ""
            com.aiyal.mobibix.ui.features.customers.CustomerDetailScreen(
                customerId = customerId,
                navController = navController
            )
        }
        composable(
            route = "customer_timeline/{customerId}",
            arguments = listOf(navArgument("customerId") { type = NavType.StringType })
        ) { backStackEntry ->
            val customerId = backStackEntry.arguments?.getString("customerId") ?: ""
            com.aiyal.mobibix.ui.features.customers.CustomerTimelineScreen(
                customerId = customerId,
                navController = navController
            )
        }
        composable("add_customer") {
            com.aiyal.mobibix.ui.features.customers.AddCustomerScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // Finance Routes
        composable("finance") {
            FinanceLandingScreen(navController = navController)
        }
        composable("purchases") {
            PurchaseListScreen(navController = navController)
        }
        composable("create_purchase") {
            CreatePurchaseScreen(navController = navController)
        }
        composable(
            route = "purchase_detail/{purchaseId}",
            arguments = listOf(navArgument("purchaseId") { type = NavType.StringType })
        ) { backStackEntry ->
            val purchaseId = backStackEntry.arguments?.getString("purchaseId") ?: ""
            PurchaseDetailScreen(purchaseId = purchaseId, navController = navController)
        }
        composable("purchase_orders") {
            com.aiyal.mobibix.ui.features.finance.purchases.PurchaseOrderListScreen(navController = navController)
        }
        composable(
            route = "purchase_order_detail/{poId}",
            arguments = listOf(navArgument("poId") { type = NavType.StringType })
        ) { backStackEntry ->
            val poId = backStackEntry.arguments?.getString("poId") ?: ""
            com.aiyal.mobibix.ui.features.finance.purchases.PurchaseOrderDetailScreen(poId = poId, navController = navController)
        }
        composable(
            route = "receive_goods/{poId}",
            arguments = listOf(navArgument("poId") { type = NavType.StringType })
        ) { backStackEntry ->
            val poId = backStackEntry.arguments?.getString("poId") ?: ""
            com.aiyal.mobibix.ui.features.finance.purchases.ReceiveGoodsScreen(poId = poId, navController = navController)
        }
        composable("receipts") {
            ReceiptListScreen(navController = navController)
        }
        composable("create_receipt") {
            CreateReceiptScreen(navController = navController)
        }
        composable("vouchers") {
            VoucherListScreen(navController = navController)
        }
        composable("create_voucher") {
            CreateVoucherScreen(navController = navController, shopContextProvider = shopContextProvider)
        }

        // WhatsApp CRM Routes
        composable("whatsapp_dashboard") {
            com.aiyal.mobibix.ui.features.whatsapp.WhatsappDashboardScreen(
                navController = navController
            )
        }
        composable("whatsapp_templates") {
            com.aiyal.mobibix.ui.features.whatsapp.WhatsappTemplatesScreen(
                navController = navController
            )
        }
        composable("whatsapp_campaigns") {
            com.aiyal.mobibix.ui.features.whatsapp.WhatsappCampaignsScreen(
                navController = navController
            )
        }
        composable("whatsapp_create_campaign") {
            com.aiyal.mobibix.ui.features.whatsapp.WhatsappCreateCampaignScreen(
                navController = navController
            )
        }
        composable("whatsapp_quick_message") {
            com.aiyal.mobibix.ui.features.whatsapp.WhatsappQuickMessageScreen(
                navController = navController
            )
        }

        // Phase 4 Routes
        composable("loyalty") {
            com.aiyal.mobibix.ui.features.loyalty.LoyaltyScreen(
                navController = navController
            )
        }
        composable("billing") {
            com.aiyal.mobibix.ui.features.billing.BillingScreen(
                navController = navController
            )
        }

        // CRM Routes
        composable("crm_dashboard") {
            com.aiyal.mobibix.ui.features.crm.CrmDashboardScreen(navController = navController)
        }
        composable("crm_follow_ups") {
            com.aiyal.mobibix.ui.features.crm.FollowUpsScreen(navController = navController)
        }
        composable("loyalty_settings") {
            com.aiyal.mobibix.ui.features.loyalty.LoyaltySettingsScreen(navController = navController)
        }
        
        // Placeholder routes for drawer items not yet implemented
        composable("settings") {
            val isOwner = appState is AppState.Owner ||
                (appState is AppState.Staff && (appState as AppState.Staff).role == com.aiyal.mobibix.core.app.UserRole.ADMIN)
            if (!isOwner) {
                // Non-owners redirected back; drawer already hides this item
                android.util.Log.w("AppNavGraph", "Blocked non-owner from settings")
                navController.navigateUp()
                return@composable
            }
            com.aiyal.mobibix.ui.features.settings.SettingsScreen(
                navController = navController,
                shopContextProvider = shopContextProvider,
                isOwner = true
            )
        }
        composable("delete_account") {
            com.aiyal.mobibix.ui.features.settings.DeleteAccountScreen(navController = navController)
        }
        composable("suppliers") {
            com.aiyal.mobibix.ui.features.suppliers.SupplierListScreen(
                navController = navController
            )
        }
        composable("import_products") {
             com.aiyal.mobibix.ui.features.products.ImportProductsScreen(navController = navController)
        }
        composable("negative_stock") {
             com.aiyal.mobibix.ui.features.products.NegativeStockScreen(navController = navController)
        }

        // ── Trade-in / Buyback ────────────────────────────────────────────────
        composable("trade_in") {
            com.aiyal.mobibix.ui.features.tradein.TradeInScreen(
                navController = navController,
                shopContextProvider = shopContextProvider
            )
        }

        // ── Consumer Finance ─────────────────────────────────────────────────
        composable("consumer_finance") {
            com.aiyal.mobibix.ui.features.consumerfinance.ConsumerFinanceScreen(
                navController = navController,
                shopContextProvider = shopContextProvider
            )
        }

        // ── Credit Notes ─────────────────────────────────────────────────────
        composable("credit_notes") {
            com.aiyal.mobibix.ui.features.creditnotes.CreditNoteListScreen(
                navController = navController,
                shopContextProvider = shopContextProvider
            )
        }
        composable(
            route = "credit_note_detail/{shopId}/{creditNoteId}",
            arguments = listOf(
                navArgument("shopId") { type = NavType.StringType },
                navArgument("creditNoteId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val shopId = backStackEntry.arguments?.getString("shopId") ?: ""
            val creditNoteId = backStackEntry.arguments?.getString("creditNoteId") ?: ""
            com.aiyal.mobibix.ui.features.creditnotes.CreditNoteDetailScreen(
                shopId = shopId, creditNoteId = creditNoteId, navController = navController
            )
        }
        composable("create_credit_note") {
            com.aiyal.mobibix.ui.features.creditnotes.CreateCreditNoteScreen(
                navController = navController, shopContextProvider = shopContextProvider
            )
        }

        // ── Quotations ───────────────────────────────────────────────────────
        composable("quotations") {
            com.aiyal.mobibix.ui.features.quotations.QuotationListScreen(
                navController = navController, shopContextProvider = shopContextProvider
            )
        }
        composable(
            route = "quotation_detail/{shopId}/{quotationId}",
            arguments = listOf(
                navArgument("shopId") { type = NavType.StringType },
                navArgument("quotationId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val shopId = backStackEntry.arguments?.getString("shopId") ?: ""
            val quotationId = backStackEntry.arguments?.getString("quotationId") ?: ""
            com.aiyal.mobibix.ui.features.quotations.QuotationDetailScreen(
                shopId = shopId, quotationId = quotationId, navController = navController
            )
        }
        composable("create_quotation") {
            com.aiyal.mobibix.ui.features.quotations.CreateQuotationScreen(
                navController = navController, shopContextProvider = shopContextProvider
            )
        }

        // ── Intelligence ─────────────────────────────────────────────────────
        composable("inventory_intelligence") {
            com.aiyal.mobibix.ui.features.intelligence.InventoryIntelligenceScreen(
                navController = navController, shopContextProvider = shopContextProvider
            )
        }
        composable("compatibility") {
            com.aiyal.mobibix.ui.features.intelligence.CompatibilityScreen(navController = navController)
        }
        composable("shrinkage_intelligence") {
            com.aiyal.mobibix.ui.features.intelligence.ShrinkageScreen(
                navController = navController, shopContextProvider = shopContextProvider
            )
        }
        composable("expense_intelligence") {
            com.aiyal.mobibix.ui.features.intelligence.ExpenseIntelligenceScreen(
                navController = navController, shopContextProvider = shopContextProvider
            )
        }
        composable("ai_chat") {
            com.aiyal.mobibix.ui.features.intelligence.AiChatScreen(navController = navController)
        }

        // ── Repair Knowledge ─────────────────────────────────────────────────
        composable("repair_knowledge") {
            com.aiyal.mobibix.ui.features.knowledge.RepairKnowledgeScreen(navController = navController)
        }

        // ── Operations ───────────────────────────────────────────────────────
        composable("expenses") {
            com.aiyal.mobibix.ui.features.operations.ExpenseScreen(
                navController = navController, shopContextProvider = shopContextProvider
            )
        }
        composable("daily_closing") {
            com.aiyal.mobibix.ui.features.operations.DailyClosingScreen(
                navController = navController, shopContextProvider = shopContextProvider
            )
        }
        composable("stock_verification") {
            com.aiyal.mobibix.ui.features.operations.StockVerificationScreen(
                navController = navController, shopContextProvider = shopContextProvider
            )
        }
        composable("monthly_report") {
            com.aiyal.mobibix.ui.features.operations.MonthlyReportScreen(
                navController = navController, shopContextProvider = shopContextProvider
            )
        }

        // ── Reports ──────────────────────────────────────────────────────────
        composable("gstr1_report") {
            com.aiyal.mobibix.ui.features.reports.Gstr1ReportScreen(
                navController = navController, shopContextProvider = shopContextProvider
            )
        }
        composable(
            route = "stock_ledger?productId={productId}",
            arguments = listOf(navArgument("productId") { type = NavType.StringType; nullable = true; defaultValue = null })
        ) { backStackEntry ->
            val productId = backStackEntry.arguments?.getString("productId")
            com.aiyal.mobibix.ui.features.reports.StockLedgerScreen(
                navController = navController,
                shopContextProvider = shopContextProvider,
                filterProductId = productId
            )
        }

        // ── Partner Portal ────────────────────────────────────────────────────
        composable("partner_login") {
            com.aiyal.mobibix.ui.features.partner.PartnerLoginScreen(navController = navController)
        }
        composable("partner_dashboard") {
            com.aiyal.mobibix.ui.features.partner.PartnerDashboardScreen(navController = navController)
        }

        // ── Approvals ────────────────────────────────────────────────────────
        composable("approvals") {
            com.aiyal.mobibix.ui.features.approvals.ApprovalInboxScreen(onNavigateBack = { navController.popBackStack() })
        }

        // ── Purchase Report ───────────────────────────────────────────────────
        composable("purchase_report") {
            com.aiyal.mobibix.ui.features.reports.PurchaseReportScreen(
                navController = navController,
                shopContextProvider = shopContextProvider
            )
        }

        // ── Sales Return ──────────────────────────────────────────────────────
        composable("sales_return") {
            com.aiyal.mobibix.ui.features.creditnotes.SalesReturnScreen(
                navController = navController,
                shopContextProvider = shopContextProvider
            )
        }

        // ── B2B Module ────────────────────────────────────────────────────────
        composable("b2b") {
            com.aiyal.mobibix.ui.features.b2b.B2bScreen(
                navController = navController,
                shopContextProvider = shopContextProvider
            )
        }

        // ── Restock / Wholesale Distributor Network ───────────────────────────
        composable("restock") {
            com.aiyal.mobibix.ui.features.b2b.RestockScreen(
                navController = navController
            )
        }

        // ── GRNs (Goods Receipt Notes) ────────────────────────────────────────
        composable("grns") {
            GRNListScreen(navController = navController)
        }
        composable(
            route = "grn_detail/{grnId}",
            arguments = listOf(navArgument("grnId") { type = NavType.StringType })
        ) { backStackEntry ->
            val grnId = backStackEntry.arguments?.getString("grnId") ?: ""
            GRNDetailScreen(grnId = grnId, navController = navController)
        }

        // ── E-Way Bill ────────────────────────────────────────────────────────
        composable("eway_bill") {
            EWayBillScreen(navController = navController)
        }

        // ── Staff Commission ──────────────────────────────────────────────────
        composable("commission") {
            CommissionScreen(navController = navController)
        }

        // ── Demand Forecast ───────────────────────────────────────────────────
        composable("demand_forecast") {
            DemandForecastScreen(
                navController = navController,
                shopContextProvider = shopContextProvider
            )
        }

        // ── Barcode Labels ────────────────────────────────────────────────────
        composable("barcode_labels") {
            com.aiyal.mobibix.ui.features.products.BarcodeLabelScreen(
                navController = navController
            )
        }
        composable(
            route = "barcode_label/{productId}",
            arguments = listOf(navArgument("productId") { type = NavType.StringType })
        ) { backStackEntry ->
            val productId = backStackEntry.arguments?.getString("productId") ?: ""
            com.aiyal.mobibix.ui.features.products.BarcodeLabelScreen(
                navController = navController,
                productId = productId
            )
        }
    } // NavHost
    } // Box
    } // Scaffold
}
