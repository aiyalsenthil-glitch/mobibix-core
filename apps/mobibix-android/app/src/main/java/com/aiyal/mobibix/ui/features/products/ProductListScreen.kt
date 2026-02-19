package com.aiyal.mobibix.ui.features.products

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.livedata.observeAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.ShopProduct
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductListScreen(
    navController: NavController,
    viewModel: ProductViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedProduct by remember { mutableStateOf<ShopProduct?>(null) }
    var showBottomSheet by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState()

    // Handle scanned barcode result
    val scannedBarcode = navController.currentBackStackEntry?.savedStateHandle?.getLiveData<String>("scanned_barcode")?.observeAsState()
    LaunchedEffect(scannedBarcode?.value) {
        scannedBarcode?.value?.let {
            viewModel.onSearchQueryChange(it)
            navController.currentBackStackEntry?.savedStateHandle?.set("scanned_barcode", null)
        }
    }

    LaunchedEffect(Unit) {
        viewModel.loadProducts()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Inventory") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                text = { Text("Add Product") },
                icon = { Icon(Icons.Default.Add, contentDescription = "Add Product") },
                onClick = { navController.navigate("add_product") }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            OutlinedTextField(
                value = uiState.searchQuery,
                onValueChange = { viewModel.onSearchQueryChange(it) },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("Search products...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    IconButton(onClick = { navController.navigate("barcode_scanner") }) {
                        Icon(Icons.Default.QrCodeScanner, contentDescription = "Scan Barcode")
                    }
                },
                singleLine = true
            )

            if (uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (uiState.error != null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = uiState.error!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
                }
            } else if (uiState.products.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No products found", modifier = Modifier.padding(16.dp))
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 80.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(uiState.products) { product ->
                        ProductItem(product = product, onClick = { 
                            selectedProduct = product
                            showBottomSheet = true
                        })
                    }
                }
            }
        }

        if (showBottomSheet && selectedProduct != null) {
            ModalBottomSheet(onDismissRequest = { showBottomSheet = false }, sheetState = sheetState) {
                Column(modifier = Modifier.padding(bottom = 32.dp)) {
                    Text(selectedProduct!!.name, modifier = Modifier.padding(16.dp), style = MaterialTheme.typography.headlineSmall)
                    HorizontalDivider(modifier = Modifier.padding(bottom = 8.dp))
                    ListItem(
                        headlineContent = { Text("Edit Product") },
                        leadingContent = { Icon(Icons.Default.Edit, contentDescription = null) },
                        modifier = Modifier.clickable {
                            showBottomSheet = false
                            navController.navigate("edit_product/${selectedProduct!!.id}")
                        }
                    )
                    ListItem(
                        headlineContent = { Text("Stock Adjustment") },
                        leadingContent = { Icon(Icons.Default.Settings, contentDescription = null) },
                        modifier = Modifier.clickable {
                            showBottomSheet = false
                            navController.navigate("stock_adjustment/${selectedProduct!!.id}")
                        }
                    )
                    ListItem(
                        headlineContent = { Text("Stock History") },
                        leadingContent = { Icon(Icons.Default.History, contentDescription = null) },
                        modifier = Modifier.clickable { showBottomSheet = false /* TODO */ }
                    )
                }
            }
        }
    }
}

@Composable
fun ProductItem(product: ShopProduct, onClick: () -> Unit) {
    val currencyFormatter = remember { NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN")) }
    
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        ListItem(
            headlineContent = { 
                Text(product.name, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis) 
            },
            supportingContent = {
                Column {
                    if (!product.sku.isNullOrBlank()) {
                        Text("SKU: ${product.sku}", style = MaterialTheme.typography.bodySmall)
                    }
                    Text("Stock: ${product.stockQty}", 
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (product.stockQty <= 0) MaterialTheme.colorScheme.error else Color.Unspecified
                    )
                }
            },
            trailingContent = {
                if (product.salePrice != null) {
                    Text(
                        currencyFormatter.format(product.salePrice / 100.0),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        )
    }
}
