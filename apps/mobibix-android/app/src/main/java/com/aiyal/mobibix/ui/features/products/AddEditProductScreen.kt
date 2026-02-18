package com.aiyal.mobibix.ui.features.products

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEditProductScreen(
    navController: NavController,
    productId: String? = null,
    viewModel: ProductViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val isEdit = productId != null

    var name by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("GOODS") }
    var category by remember { mutableStateOf("") }
    var salePrice by remember { mutableStateOf("") }
    var costPrice by remember { mutableStateOf("") }
    var gstRate by remember { mutableStateOf("18.0") }
    var hsnCode by remember { mutableStateOf("") }
    var isSerialized by remember { mutableStateOf(false) }

    // Initialize if editing
    LaunchedEffect(productId, uiState.products) {
        if (isEdit && uiState.products.isNotEmpty()) {
            val product = uiState.products.find { it.id == productId }
            product?.let {
                name = it.name
                category = it.category ?: ""
                salePrice = (it.salePrice?.toDouble()?.div(100.0) ?: 0.0).toString()
                costPrice = (it.costPrice?.toDouble()?.div(100.0) ?: 0.0).toString()
                gstRate = "18.0" // TODO: Add gstRate to ShopProduct DTO if needed
                hsnCode = "" // TODO: Add hsnCode to ShopProduct DTO if needed
                isSerialized = false // TODO: Match backend isSerialized logic
            }
        }
    }

    LaunchedEffect(uiState.actionSuccess) {
        if (uiState.actionSuccess) {
            viewModel.resetActionSuccess()
            navController.popBackStack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (isEdit) "Edit Product" else "New Product") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            if (isEdit) {
                                viewModel.updateProduct(
                                    productId!!,
                                    name,
                                    type,
                                    salePrice.toDoubleOrNull(),
                                    category.takeIf { it.isNotBlank() },
                                    costPrice.toDoubleOrNull(),
                                    gstRate.toFloatOrNull(),
                                    hsnCode.takeIf { it.isNotBlank() }
                                )
                            } else {
                                viewModel.createProduct(
                                    name,
                                    type,
                                    salePrice.toDoubleOrNull() ?: 0.0,
                                    category.takeIf { it.isNotBlank() },
                                    isSerialized,
                                    costPrice.toDoubleOrNull(),
                                    gstRate.toFloatOrNull(),
                                    hsnCode.takeIf { it.isNotBlank() }
                                )
                            }
                        }
                    ) {
                        Icon(Icons.Default.Save, contentDescription = "Save")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedCorner(8.dp)
        ) {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Product Name *") },
                modifier = Modifier.fillMaxWidth()
            )

            Text("Product Type", style = MaterialTheme.typography.labelMedium)
            Row(modifier = Modifier.fillMaxWidth()) {
                FilterChip(
                    selected = type == "GOODS",
                    onClick = { type = "GOODS" },
                    label = { Text("Goods") }
                )
                Spacer(modifier = Modifier.width(8.dp))
                FilterChip(
                    selected = type == "SERVICE",
                    onClick = { type = "SERVICE" },
                    label = { Text("Service") }
                )
                Spacer(modifier = Modifier.width(8.dp))
                FilterChip(
                    selected = type == "SPARE",
                    onClick = { type = "SPARE" },
                    label = { Text("Spare") }
                )
            }

            if (type == "GOODS") {
                Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                    Checkbox(checked = isSerialized, onCheckedChange = { isSerialized = it })
                    Text("Track by IMEI / Serial Number")
                }
            }

            OutlinedTextField(
                value = category,
                onValueChange = { category = it },
                label = { Text("Category") },
                modifier = Modifier.fillMaxWidth()
            )

            Row(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = salePrice,
                    onValueChange = { salePrice = it },
                    label = { Text("Selling Price *") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                )
                Spacer(modifier = Modifier.width(8.dp))
                OutlinedTextField(
                    value = costPrice,
                    onValueChange = { costPrice = it },
                    label = { Text("Cost Price") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                )
            }

            Row(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = gstRate,
                    onValueChange = { gstRate = it },
                    label = { Text("GST Rate (%)") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                )
                Spacer(modifier = Modifier.width(8.dp))
                OutlinedTextField(
                    value = hsnCode,
                    onValueChange = { hsnCode = it },
                    label = { Text("HSN/SAC") },
                    modifier = Modifier.weight(1f)
                )
            }

            if (uiState.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            if (uiState.error != null) {
                Text(text = uiState.error!!, color = MaterialTheme.colorScheme.error)
            }

            Spacer(modifier = Modifier.height(32.dp))
            
            Button(
                onClick = {
                    if (isEdit) {
                        viewModel.updateProduct(
                            productId!!,
                            name,
                            type,
                            salePrice.toDoubleOrNull(),
                            category.takeIf { it.isNotBlank() },
                            costPrice.toDoubleOrNull(),
                            gstRate.toFloatOrNull(),
                            hsnCode.takeIf { it.isNotBlank() }
                        )
                    } else {
                        viewModel.createProduct(
                            name,
                            type,
                            salePrice.toDoubleOrNull() ?: 0.0,
                            category.takeIf { it.isNotBlank() },
                            isSerialized,
                            costPrice.toDoubleOrNull(),
                            gstRate.toFloatOrNull(),
                            hsnCode.takeIf { it.isNotBlank() }
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = name.isNotBlank() && salePrice.isNotBlank() && !uiState.isLoading
            ) {
                Text(if (isEdit) "Update Product" else "Create Product")
            }
        }
    }
}

private fun Arrangement.spacedCorner(dp: androidx.compose.ui.unit.Dp): Arrangement.Vertical {
    return Arrangement.spacedBy(dp)
}
