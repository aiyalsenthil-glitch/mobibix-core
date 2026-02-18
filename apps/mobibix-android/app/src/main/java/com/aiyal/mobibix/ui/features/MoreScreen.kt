package com.aiyal.mobibix.ui.features

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForwardIos
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect

@Composable
fun MoreScreen(
    onNavigateToReports: () -> Unit,
    onNavigateToStaff: () -> Unit,
    onNavigateToCustomers: () -> Unit,
    onNavigateToShopSettings: () -> Unit,
    onNavigateToJobCardSettings: () -> Unit,
    onNavigateToInvoiceSettings: () -> Unit,
    onNavigateToFinance: () -> Unit,
    onLogout: () -> Unit,
    viewModel: MoreViewModel = hiltViewModel()
) {
    val logoutComplete by viewModel.logoutComplete.collectAsState()

    LaunchedEffect(logoutComplete) {
        if (logoutComplete) {
            viewModel.resetLogoutState()
            onLogout()
        }
    }

    Scaffold {
        LazyColumn(modifier = Modifier.padding(it)) {
            item {
                Text("More Options", modifier = Modifier.padding(16.dp), style = androidx.compose.material3.MaterialTheme.typography.headlineSmall)
            }
            item {
                MenuListItem("Reports", onNavigateToReports)
                MenuListItem("Finance", onNavigateToFinance)
                MenuListItem("Customers", onNavigateToCustomers)
                MenuListItem("Staff", onNavigateToStaff)
                MenuListItem("Shop Settings", onNavigateToShopSettings)
                MenuListItem("Job Card Settings", onNavigateToJobCardSettings)
                MenuListItem("Invoice Settings", onNavigateToInvoiceSettings)
                HorizontalDivider()
                MenuListItem("Logout", onClick = { viewModel.logout() })
            }
        }
    }
}

@Composable
private fun MenuListItem(title: String, onClick: () -> Unit) {
    Column {
        ListItem(
            headlineContent = { Text(title) },
            trailingContent = { Icon(Icons.AutoMirrored.Filled.ArrowForwardIos, contentDescription = null) },
            modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
        )
        HorizontalDivider()
    }
}
