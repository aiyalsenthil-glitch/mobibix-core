package com.aiyal.mobibix.ui.features.billing

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.BillingInvoice
import com.aiyal.mobibix.data.network.SubscriptionPlan
import com.aiyal.mobibix.ui.theme.MobiBixTheme
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BillingScreen(
    navController: NavController,
    viewModel: BillingViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale("en", "IN"))

    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Billing & Subscription") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                if (uiState.isLoading) {
                    LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                }
                if (uiState.error != null) {
                    Text(
                        text = uiState.error!!,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
            }

            // Current Plan Section
            item {
                Text("Current Plan", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                uiState.currentPlan?.let { plan ->
                    CurrentPlanCard(plan, currencyFormatter)
                }
            }

            // Available Plans Section
            item {
                Text("Available Plans", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                uiState.availablePlans.forEach { plan ->
                    if (plan.id != uiState.currentPlan?.id) {
                        PlanItem(plan, currencyFormatter) {
                            viewModel.upgradePlan(plan.id)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }
            }

            // Invoices Section
            item {
                Text("Invoices", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                uiState.invoices.forEach { invoice ->
                    InvoiceItem(invoice, currencyFormatter)
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
fun CurrentPlanCard(plan: SubscriptionPlan, formatter: NumberFormat) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(plan.name, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Icon(Icons.Default.CheckCircle, contentDescription = "Active", tint = MaterialTheme.colorScheme.primary)
            }
            Text(formatter.format(plan.price) + " / month", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            plan.features.forEach { feature ->
                Text("• $feature", style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
fun PlanItem(plan: SubscriptionPlan, formatter: NumberFormat, onUpgrade: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(plan.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(formatter.format(plan.price), style = MaterialTheme.typography.titleMedium)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Button(onClick = onUpgrade, modifier = Modifier.fillMaxWidth()) {
                Text("Upgrade")
            }
        }
    }
}

@Composable
fun InvoiceItem(invoice: BillingInvoice, formatter: NumberFormat) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .padding(12.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(invoice.date, fontWeight = FontWeight.Bold)
                Text(invoice.status, style = MaterialTheme.typography.bodySmall)
            }
            Text(formatter.format(invoice.amount), fontWeight = FontWeight.Bold)
        }
    }
}
