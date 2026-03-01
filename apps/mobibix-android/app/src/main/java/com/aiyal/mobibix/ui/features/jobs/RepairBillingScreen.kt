package com.aiyal.mobibix.ui.features.jobs

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.RepairBillRequest
import com.aiyal.mobibix.data.network.RepairBillServiceItem
import com.aiyal.mobibix.data.network.RepairBillPartItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RepairBillingScreen(
    shopId: String,
    jobId: String,
    navController: NavController,
    viewModel: JobDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val job = uiState.job

    var billingMode by remember { mutableStateOf("WITHOUT_GST") }
    var paymentMode by remember { mutableStateOf("CASH") }
    var laborCharge by remember { mutableStateOf("") }
    var deliverImmediately by remember { mutableStateOf(true) }

    LaunchedEffect(jobId) {
        viewModel.loadJobDetails(shopId, jobId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Generate Repair Bill") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (job == null) {
            Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            Column(
                modifier = Modifier
                    .padding(padding)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text("Job: ${job.jobNumber}", style = MaterialTheme.typography.titleMedium)
                
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Billing Mode", fontWeight = FontWeight.Bold)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(selected = billingMode == "WITHOUT_GST", onClick = { billingMode = "WITHOUT_GST" })
                            Text("Standard (Estimate)")
                            Spacer(Modifier.width(16.dp))
                            RadioButton(selected = billingMode == "WITH_GST", onClick = { billingMode = "WITH_GST" })
                            Text("GST Invoice")
                        }
                    }
                }

                OutlinedTextField(
                    value = laborCharge,
                    onValueChange = { laborCharge = it },
                    label = { Text("Labor / Service Charge (₹)") },
                    modifier = Modifier.fillMaxWidth()
                )

                Text("Parts Used", style = MaterialTheme.typography.titleMedium)
                job.parts.forEach { part ->
                    Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                        Text(part.productName)
                        Text("₹${part.totalPrice}")
                    }
                }
                
                HorizontalDivider()
                
                val partsTotal = job.parts.sumOf { it.totalPrice }
                val labor = laborCharge.toDoubleOrNull() ?: 0.0
                val total = partsTotal + labor
                
                Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                    Text("Total Amount", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                    Text("₹$total", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                }

                Text("Payment Mode", fontWeight = FontWeight.Bold)
                Row {
                    listOf("CASH", "UPI", "CARD").forEach { mode ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(selected = paymentMode == mode, onClick = { paymentMode = mode })
                            Text(mode)
                        }
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = deliverImmediately, onCheckedChange = { deliverImmediately = it })
                    Text("Deliver device immediately")
                }

                Button(
                    onClick = {
                        val request = RepairBillRequest(
                            shopId = shopId,
                            jobCardId = jobId,
                            services = listOf(RepairBillServiceItem("Repair Labor", labor)),
                            parts = job.parts.map { RepairBillPartItem(it.productId, it.quantity, it.unitPrice, 0.0) },
                            billingMode = billingMode,
                            paymentMode = paymentMode,
                            deliverImmediately = deliverImmediately
                        )
                        viewModel.generateBill(shopId, jobId, request) {
                            navController.popBackStack()
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(50.dp)
                ) {
                    Text("Generate Bill & Complete")
                }
            }
        }
    }
}
