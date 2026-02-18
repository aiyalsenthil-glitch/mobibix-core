package com.aiyal.mobibix.ui.features.shop

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController

@Composable
fun ShopManagementScreen(
    navController: NavController,
    viewModel: ShopListViewModel = hiltViewModel()
) {
    val shops by viewModel.shops.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState() // Corrected from 'var' to 'val'

    LaunchedEffect(Unit) {
        viewModel.loadShops()
    }

    Scaffold(
        floatingActionButton = {
            ExtendedFloatingActionButton(
                text = { Text("Add New Shop") },
                icon = { Icon(Icons.Default.Add, contentDescription = "Add Shop") },
                onClick = { navController.navigate("create_shop") }
            )
        }
    ) {
        Column(modifier = Modifier.padding(it).fillMaxSize()) {
            Text("Shop Management", style = androidx.compose.material3.MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(16.dp))

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (shops.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No shops found. Add one to get started.")
                }
            } else {
                LazyColumn {
                    items(shops) { shop ->
                        Column {
                            ListItem(
                                headlineContent = { Text(shop.name ?: "Unnamed Shop") },
                                supportingContent = { Text(listOfNotNull(shop.addressLine1, shop.city).joinToString(", ").ifBlank { "No address" }) },
                                modifier = Modifier.fillMaxWidth().clickable { 
                                    navController.navigate("shop_settings/${shop.id}") 
                                }
                            )
                            HorizontalDivider()
                        }
                    }
                }
            }
        }
    }
}
