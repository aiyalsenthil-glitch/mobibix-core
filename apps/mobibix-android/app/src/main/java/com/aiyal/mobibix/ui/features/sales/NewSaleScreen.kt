package com.aiyal.mobibix.ui.features.sales

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.livedata.observeAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.CreateInvoiceRequest
import com.aiyal.mobibix.data.network.InvoiceItemRequest
import com.aiyal.mobibix.data.network.PaymentMethodRequest
import com.aiyal.mobibix.data.network.ShopProduct
import com.aiyal.mobibix.ui.features.customers.CustomerViewModel
import com.aiyal.mobibix.util.CurrencyUtils
import kotlinx.coroutines.launch

private val PAYMENT_MODES = listOf("CASH", "UPI", "CARD", "BANK_TRANSFER", "CREDIT")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewSaleScreen(
    shopId: String,
    navController: NavController,
    viewModel: SalesViewModel = hiltViewModel(),
    customerViewModel: CustomerViewModel = hiltViewModel()
) {
    val products by viewModel.products.collectAsState()
    val gstEnabled by viewModel.gstEnabled.collectAsState()
    val saving by viewModel.saving.collectAsState()

    var customerId by remember { mutableStateOf<String?>(null) }
    var customerName by remember { mutableStateOf("") }
    var customerPhone by remember { mutableStateOf("") }
    var showCustomerPicker by remember { mutableStateOf(false) }
    var showProductGrid by remember { mutableStateOf(false) }
    var paymentMode by remember { mutableStateOf("CASH") }
    var isSplitPayment by remember { mutableStateOf(false) }
    val splitMethods = remember { mutableStateListOf<PaymentMethodUi>() }

    val cartItems = remember { mutableStateListOf<InvoiceItemUi>() }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    val configuration = LocalConfiguration.current
    val isWideScreen = configuration.screenWidthDp >= 840

    fun addToCart(product: ShopProduct) {
        if (!product.isSerialized) {
            val idx = cartItems.indexOfFirst { it.productId == product.id }
            if (idx >= 0) {
                cartItems[idx] = cartItems[idx].copy(quantity = cartItems[idx].quantity + 1)
                return
            }
        }
        cartItems.add(
            InvoiceItemUi(
                productId = product.id,
                productName = product.name,
                rate = (product.salePrice ?: 0) / 100.0,
                gstRate = product.gstRate ?: 0.0,
                isSerialized = product.isSerialized,
                imeis = if (product.isSerialized) listOf("") else emptyList()
            )
        )
    }

    // Barcode scanner integration — read scanned result from savedStateHandle
    val scannedBarcode = navController.currentBackStackEntry
        ?.savedStateHandle
        ?.getLiveData<String>("scanned_barcode")
        ?.observeAsState()

    LaunchedEffect(scannedBarcode?.value) {
        val barcode = scannedBarcode?.value
        if (!barcode.isNullOrBlank()) {
            val match = products.firstOrNull {
                it.sku?.equals(barcode, ignoreCase = true) == true ||
                it.name.equals(barcode, ignoreCase = true)
            }
            if (match != null) addToCart(match)
            navController.currentBackStackEntry?.savedStateHandle?.set("scanned_barcode", null)
        }
    }

    LaunchedEffect(shopId) {
        if (shopId.isNotBlank()) {
            viewModel.loadInitialData(shopId)
            customerViewModel.loadCustomers()
        }
    }

    if (showCustomerPicker) {
        CustomerPickerDialog(
            customerViewModel = customerViewModel,
            onDismiss = { showCustomerPicker = false },
            onCustomerSelected = { id, name, phone ->
                customerId = id
                customerName = name
                customerPhone = phone ?: ""
                showCustomerPicker = false
            }
        )
    }

    // Full-screen product grid dialog for phones
    if (showProductGrid && !isWideScreen) {
        Dialog(
            onDismissRequest = { showProductGrid = false },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Surface(modifier = Modifier.fillMaxSize()) {
                Column {
                    TopAppBar(
                        title = { Text("Select Product") },
                        navigationIcon = {
                            IconButton(onClick = { showProductGrid = false }) {
                                Icon(Icons.Default.Close, contentDescription = "Close")
                            }
                        }
                    )
                    ProductGridPanel(
                        products = products,
                        onProductSelected = { product ->
                            addToCart(product)
                            showProductGrid = false
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        }
    }

    fun buildAndSubmit() {
        val request = CreateInvoiceRequest(
            shopId = shopId,
            customerId = customerId,
            customerName = customerName.takeIf { it.isNotBlank() },
            customerPhone = customerPhone.takeIf { it.isNotBlank() },
            paymentMode = if (isSplitPayment) null else paymentMode,
            paymentMethods = if (isSplitPayment) splitMethods.map {
                PaymentMethodRequest(mode = it.mode, amount = it.amount)
            } else null,
            items = cartItems.mapNotNull { item ->
                item.productId?.let {
                    val appliedGstRate = if (item.gstRate == -1.0) item.customGstRate ?: 0.0 else item.gstRate
                    InvoiceItemRequest(
                        shopProductId = it,
                        quantity = item.quantity,
                        rate = item.rate,
                        gstRate = appliedGstRate,
                        imeis = if (item.isSerialized) item.imeis.filter { s -> s.isNotBlank() } else null
                    )
                }
            }
        )
        viewModel.createInvoice(
            request = request,
            onSuccess = { navController.popBackStack() },
            onError = { error -> scope.launch { snackbarHostState.showSnackbar(error) } }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New Sale") },
                navigationIcon = {
                    IconButton(onClick = { navController.navigateUp() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { navController.navigate("barcode_scanner") }) {
                        Icon(Icons.Default.QrCodeScanner, contentDescription = "Scan Barcode")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        if (isWideScreen) {
            // ── Tablet two-pane layout ──────────────────────────────────────────
            Row(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize()
            ) {
                // Left panel: product grid (always visible)
                Surface(
                    modifier = Modifier
                        .weight(0.58f)
                        .fillMaxHeight(),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                ) {
                    ProductGridPanel(
                        products = products,
                        onProductSelected = { addToCart(it) },
                        modifier = Modifier.fillMaxSize()
                    )
                }

                VerticalDivider()

                // Right panel: cart + customer + payment
                LazyColumn(
                    modifier = Modifier
                        .weight(0.42f)
                        .fillMaxHeight(),
                    contentPadding = PaddingValues(16.dp)
                ) {
                    item {
                        CustomerSection(
                            customerId = customerId,
                            customerName = customerName,
                            customerPhone = customerPhone,
                            onShowPicker = { showCustomerPicker = true },
                            onClear = { customerId = null; customerName = ""; customerPhone = "" },
                            onNameChange = { customerName = it },
                            onPhoneChange = { customerPhone = it }
                        )
                    }

                    item {
                        Spacer(Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Cart",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.weight(1f)
                            )
                            if (cartItems.isNotEmpty()) {
                                val grandTotal = cartItems.sumOf { item ->
                                    val gst = if (item.gstRate == -1.0) item.customGstRate ?: 0.0 else item.gstRate
                                    item.quantity * item.rate * (1 + gst / 100.0)
                                }
                                Text(
                                    CurrencyUtils.formatRupees(grandTotal),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                        Spacer(Modifier.height(4.dp))
                    }

                    if (cartItems.isEmpty()) {
                        item {
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(
                                        Icons.Default.ShoppingCart,
                                        contentDescription = null,
                                        modifier = Modifier.size(40.dp),
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        "Tap a product to add it to cart",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    } else {
                        items(cartItems.toList()) { item ->
                            InvoiceItemRow(
                                item = item,
                                onRemove = { cartItems.remove(item) },
                                onItemChange = { updated ->
                                    val idx = cartItems.indexOf(item)
                                    if (idx != -1) cartItems[idx] = updated
                                },
                                gstEnabled = gstEnabled
                            )
                        }
                    }

                    item {
                        Spacer(Modifier.height(8.dp))
                        PaymentPanel(
                            paymentMode = paymentMode,
                            onModeChange = { paymentMode = it },
                            isSplit = isSplitPayment,
                            onSplitToggle = { isSplitPayment = it },
                            splitMethods = splitMethods,
                            grandTotal = cartItems.sumOf { item ->
                                val gst = if (item.gstRate == -1.0) item.customGstRate ?: 0.0 else item.gstRate
                                item.quantity * item.rate * (1 + gst / 100.0)
                            }
                        )
                    }

                    item {
                        Spacer(Modifier.height(12.dp))
                        Button(
                            enabled = cartItems.none { it.productId == null } && cartItems.isNotEmpty() && !saving,
                            onClick = { buildAndSubmit() },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                        ) {
                            if (saving) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    color = MaterialTheme.colorScheme.onPrimary
                                )
                            } else {
                                Text("Create Invoice", style = MaterialTheme.typography.labelLarge)
                            }
                        }
                        Spacer(Modifier.height(32.dp))
                    }
                }
            }
        } else {
            // ── Phone layout: LazyColumn with grid picker dialog ───────────────
            LazyColumn(
                modifier = Modifier
                    .padding(padding)
                    .padding(horizontal = 16.dp)
            ) {
                item {
                    CustomerSection(
                        customerId = customerId,
                        customerName = customerName,
                        customerPhone = customerPhone,
                        onShowPicker = { showCustomerPicker = true },
                        onClear = { customerId = null; customerName = ""; customerPhone = "" },
                        onNameChange = { customerName = it },
                        onPhoneChange = { customerPhone = it }
                    )
                }

                items(cartItems.toList()) { item ->
                    InvoiceItemRow(
                        item = item,
                        onRemove = { cartItems.remove(item) },
                        onItemChange = { updated ->
                            val idx = cartItems.indexOf(item)
                            if (idx != -1) cartItems[idx] = updated
                        },
                        gstEnabled = gstEnabled
                    )
                }

                item {
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { showProductGrid = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.ShoppingCart, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.size(6.dp))
                        Text("Browse & Add Products")
                    }
                    Spacer(Modifier.height(8.dp))
                }

                item {
                    PaymentPanel(
                        paymentMode = paymentMode,
                        onModeChange = { paymentMode = it },
                        isSplit = isSplitPayment,
                        onSplitToggle = { isSplitPayment = it },
                        splitMethods = splitMethods,
                        grandTotal = cartItems.sumOf { item ->
                            val gst = if (item.gstRate == -1.0) item.customGstRate ?: 0.0 else item.gstRate
                            item.quantity * item.rate * (1 + gst / 100.0)
                        }
                    )
                }

                item {
                    Spacer(Modifier.height(16.dp))
                    Button(
                        enabled = cartItems.none { it.productId == null } && cartItems.isNotEmpty() && !saving,
                        onClick = { buildAndSubmit() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        if (saving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Text("Create Invoice", style = MaterialTheme.typography.labelLarge)
                        }
                    }
                    Spacer(Modifier.height(32.dp))
                }
            }
        }
    }
}

// ── Shared section composables ────────────────────────────────────────────────

@Composable
private fun CustomerSection(
    customerId: String?,
    customerName: String,
    customerPhone: String,
    onShowPicker: () -> Unit,
    onClear: () -> Unit,
    onNameChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Customer",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            if (customerId != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Person, contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.size(8.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(customerName, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                        if (customerPhone.isNotBlank()) {
                            Text(
                                customerPhone,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    TextButton(onClick = onClear) { Text("Change") }
                }
                Spacer(Modifier.height(8.dp))
            }
            OutlinedButton(
                onClick = onShowPicker,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.size(6.dp))
                Text(if (customerId == null) "Search Existing Customer" else "Search Different Customer")
            }
            if (customerId == null) {
                Spacer(Modifier.height(8.dp))
                Text(
                    "Or enter manually:",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.height(4.dp))
                OutlinedTextField(
                    value = customerName,
                    onValueChange = onNameChange,
                    label = { Text("Customer Name") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = customerPhone,
                    onValueChange = onPhoneChange,
                    label = { Text("Customer Phone") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PaymentPanel(
    paymentMode: String,
    onModeChange: (String) -> Unit,
    isSplit: Boolean,
    onSplitToggle: (Boolean) -> Unit,
    splitMethods: androidx.compose.runtime.snapshots.SnapshotStateList<PaymentMethodUi>,
    grandTotal: Double
) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Payment *",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f)
                )
                Text("Split", style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.size(4.dp))
                Switch(
                    checked = isSplit,
                    onCheckedChange = { enabled ->
                        onSplitToggle(enabled)
                        if (enabled && splitMethods.isEmpty()) {
                            splitMethods.add(PaymentMethodUi("CASH", grandTotal))
                        }
                    }
                )
            }

            if (!isSplit) {
                Spacer(Modifier.height(8.dp))
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(PAYMENT_MODES) { mode ->
                        FilterChip(
                            selected = paymentMode == mode,
                            onClick = { onModeChange(mode) },
                            label = {
                                Text(mode.replace("_", " "), style = MaterialTheme.typography.labelSmall)
                            }
                        )
                    }
                }
            } else {
                Spacer(Modifier.height(8.dp))
                splitMethods.forEachIndexed { index, method ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(vertical = 4.dp)
                    ) {
                        var modeExpanded by remember { mutableStateOf(false) }
                        ExposedDropdownMenuBox(
                            expanded = modeExpanded,
                            onExpandedChange = { modeExpanded = !modeExpanded },
                            modifier = Modifier.weight(1f)
                        ) {
                            OutlinedTextField(
                                value = method.mode.replace("_", " "),
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Mode") },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(modeExpanded) },
                                modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable)
                            )
                            ExposedDropdownMenu(
                                expanded = modeExpanded,
                                onDismissRequest = { modeExpanded = false }
                            ) {
                                PAYMENT_MODES.forEach { m ->
                                    DropdownMenuItem(
                                        text = { Text(m.replace("_", " ")) },
                                        onClick = {
                                            splitMethods[index] = method.copy(mode = m)
                                            modeExpanded = false
                                        }
                                    )
                                }
                            }
                        }
                        OutlinedTextField(
                            value = method.amount.toString(),
                            onValueChange = { v ->
                                splitMethods[index] = method.copy(amount = v.toDoubleOrNull() ?: 0.0)
                            },
                            label = { Text("₹") },
                            modifier = Modifier.weight(1f),
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                                keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
                            ),
                            singleLine = true
                        )
                        if (splitMethods.size > 1) {
                            IconButton(onClick = { splitMethods.removeAt(index) }) {
                                Icon(
                                    androidx.compose.material.icons.Icons.Default.Close,
                                    contentDescription = "Remove",
                                    tint = MaterialTheme.colorScheme.error
                                )
                            }
                        }
                    }
                }
                TextButton(
                    onClick = { splitMethods.add(PaymentMethodUi("UPI", 0.0)) }
                ) {
                    Text("+ Add Method")
                }
            }
        }
    }
}

// ── Customer picker dialog ────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CustomerPickerDialog(
    customerViewModel: CustomerViewModel,
    onDismiss: () -> Unit,
    onCustomerSelected: (id: String, name: String, phone: String?) -> Unit
) {
    val uiState by customerViewModel.uiState.collectAsState()
    var query by remember { mutableStateOf("") }

    val filtered by remember(query, uiState.customers) {
        derivedStateOf {
            if (query.isBlank()) uiState.customers
            else uiState.customers.filter {
                it.name.contains(query, ignoreCase = true) ||
                it.phone.contains(query, ignoreCase = true)
            }
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Select Customer") },
        text = {
            Column {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text("Search by name or phone") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                Spacer(Modifier.height(8.dp))
                if (uiState.loading) {
                    CircularProgressIndicator(
                        modifier = Modifier
                            .align(Alignment.CenterHorizontally)
                            .padding(16.dp)
                    )
                } else if (filtered.isEmpty()) {
                    Text(
                        if (query.isBlank()) "No customers found" else "No match for \"$query\"",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(8.dp)
                    )
                } else {
                    LazyColumn(modifier = Modifier.height(300.dp)) {
                        items(filtered.take(50)) { customer ->
                            ListItem(
                                headlineContent = { Text(customer.name) },
                                supportingContent = { Text(customer.phone) },
                                modifier = Modifier.clickable {
                                    onCustomerSelected(customer.id, customer.name, customer.phone)
                                }
                            )
                            HorizontalDivider()
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
