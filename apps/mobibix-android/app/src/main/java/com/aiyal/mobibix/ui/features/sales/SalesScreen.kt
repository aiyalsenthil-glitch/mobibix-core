package com.aiyal.mobibix.ui.features.sales

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.aiyal.mobibix.ui.features.ComingSoonScreen

@Composable
fun SalesScreen(navController: NavController) {
    Scaffold(
        floatingActionButton = {
            ExtendedFloatingActionButton(
                text = { Text("New Sale") },
                icon = { Icon(Icons.Default.Add, contentDescription = "New Sale") },
                onClick = { navController.navigate("new_sale") }
            )
        }
    ) {
        Column(modifier = Modifier.padding(it).fillMaxSize()) {
            Text("Sales Invoices", style = androidx.compose.material3.MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(16.dp))
            ComingSoonScreen()
        }
    }
}
