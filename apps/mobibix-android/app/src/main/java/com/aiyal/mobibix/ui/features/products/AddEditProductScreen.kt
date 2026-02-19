package com.aiyal.mobibix.ui.features.products

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
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

    LaunchedEffect(productId, uiState.products) {
        if (isEdit && uiState.products.isNotEmpty()) {
            uiState.products.find { it.id == productId }?.let {
                name = it.name
                category = it.category ?: ""
                salePrice = (it.salePrice?.div(100.0))?.toString() ?: ""
                costPrice = (it.costPrice?.div(100.0))?.toString() ?: ""
                // TODO: Populate gstRate, hsnCode, etc. from DTO
            }
        }
    }

    LaunchedEffect(uiState.actionSuccess) {
        if (uiState.actionSuccess) {
            viewModel.resetActionSuccess()
            navController.popBackStack()
        }
    }

    val saveAction = {
        val finalSalePrice = salePrice.toDoubleOrNull()
        val finalCostPrice = costPrice.toDoubleOrNull()
        val finalGstRate = gstRate.toFloatOrNull()
        
        if (isEdit) {
            viewModel.updateProduct(productId!!, name, type, finalSalePrice, category.takeIf { it.isNotBlank() }, finalCostPrice, finalGstRate, hsnCode.takeIf { it.isNotBlank() })
        } else {
            viewModel.createProduct(name, type, finalSalePrice ?: 0.0, category.takeIf { it.isNotBlank() }, isSerialized, finalCostPrice, finalGstRate, hsnCode.takeIf { it.isNotBlank() })
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (isEdit) "Edit Product" else "New Product") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = saveAction,
                modifier = Modifier.padding(16.dp)
            ) {
                Icon(Icons.Default.Save, contentDescription = "Save")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (uiState.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }
            if (uiState.error != null) {
                Text(text = uiState.error!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(vertical = 8.dp))
            }

            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Product Name *") }, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = category, onValueChange = { category = it }, label = { Text("Category") }, modifier = Modifier.fillMaxWidth())
                }
            }

            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Product Type", style = MaterialTheme.typography.titleSmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(selected = type == "GOODS", onClick = { type = "GOODS" }, label = { Text("Goods") })
                        FilterChip(selected = type == "SERVICE", onClick = { type = "SERVICE" }, label = { Text("Service") })
                        FilterChip(selected = type == "SPARE", onClick = { type = "SPARE" }, label = { Text("Spare") })
                    }
                    if (type == "GOODS") {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = isSerialized, onCheckedChange = { isSerialized = it })
                            Text("Track by IMEI / Serial Number")
                        }
                    }
                }
            }

            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        OutlinedTextField(value = salePrice, onValueChange = { salePrice = it }, label = { Text("Selling Price *") }, modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                        OutlinedTextField(value = costPrice, onValueChange = { costPrice = it }, label = { Text("Cost Price") }, modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        OutlinedTextField(value = gstRate, onValueChange = { gstRate = it }, label = { Text("GST Rate (%)") }, modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                        OutlinedTextField(value = hsnCode, onValueChange = { hsnCode = it }, label = { Text("HSN/SAC") }, modifier = Modifier.weight(1f))
                    }
                }
            }
            Spacer(modifier = Modifier.height(80.dp)) // Spacer for FAB
        }
    }
}
