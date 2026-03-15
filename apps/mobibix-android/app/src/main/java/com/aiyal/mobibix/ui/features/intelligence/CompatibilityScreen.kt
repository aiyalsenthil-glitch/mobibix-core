package com.aiyal.mobibix.ui.features.intelligence

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CompatibilityScreen(
    navController: NavController,
    viewModel: IntelligenceViewModel = hiltViewModel()
) {
    val state by viewModel.compatibilityState.collectAsState()
    var query by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Compatibility Finder", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            // Search bar
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = query,
                    onValueChange = {
                        query = it
                        if (it.length >= 2) viewModel.autocompleteModels(it)
                    },
                    label = { Text("Phone model (e.g. Samsung Galaxy S21)") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) }
                )
                Button(
                    onClick = { viewModel.searchCompatibility(query) },
                    enabled = query.isNotBlank() && !state.loading
                ) { Text("Search") }
            }

            // Autocomplete suggestions
            if (state.suggestions.isNotEmpty() && state.result == null) {
                Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                    Column {
                        state.suggestions.take(5).forEach { s ->
                            TextButton(
                                onClick = {
                                    query = s.fullName
                                    viewModel.searchCompatibility(s.fullName)
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) { Text(s.fullName, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.fillMaxWidth()) }
                        }
                    }
                }
            }

            when {
                state.loading -> Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
                state.error != null -> Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                ) {
                    Text(state.error!!, modifier = Modifier.padding(12.dp), color = MaterialTheme.colorScheme.error)
                }
                state.result != null -> {
                    val result = state.result!!
                    Text("Compatible parts for ${result.model}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    if (result.compatibleParts.isEmpty()) {
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                            Text("No compatible parts found", modifier = Modifier.padding(16.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            result.compatibleParts.forEach { (partType, parts) ->
                                item {
                                    Text(partType, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)
                                }
                                items(parts) { part ->
                                    Card(
                                        shape = RoundedCornerShape(10.dp),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                    ) {
                                        Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(part.name, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                                                val badge = if (part.source == "INVENTORY") "In Stock" else "Catalog"
                                                Surface(shape = RoundedCornerShape(20.dp), color = if (part.source == "INVENTORY") Color(0xFF00C896).copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant) {
                                                    Text(badge, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), fontSize = 10.sp, color = if (part.source == "INVENTORY") Color(0xFF00C896) else MaterialTheme.colorScheme.onSurfaceVariant)
                                                }
                                            }
                                            Column(horizontalAlignment = Alignment.End) {
                                                if (part.price != null) Text("₹${String.format("%.2f", part.price)}", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                                if (part.quantity != null) Text("Qty: ${part.quantity}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
