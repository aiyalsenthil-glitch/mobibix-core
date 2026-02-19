package com.aiyal.mobibix.ui.features.sales

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.CreateInvoiceRequest
import com.aiyal.mobibix.data.network.InvoiceItemRequest
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SalesInvoiceFormScreen(
    shopId: String,
    navController: NavController,
    viewModel: SalesViewModel = hiltViewModel()
) {
    val products by viewModel.products.collectAsState()
    val gstEnabled by viewModel.gstEnabled.collectAsState()
    var customerName by remember { mutableStateOf("") }
    var customerPhone by remember { mutableStateOf("") }
    var paymentMode by remember { mutableStateOf("CASH") }

    val items = remember { mutableStateListOf<InvoiceItemUi>() }

    val saving by viewModel.saving.collectAsState() // Correctly collect the state

    LaunchedEffect(shopId) {
        if (shopId.isNotBlank()) {
            viewModel.loadInitialData(shopId)
        }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("New Sale") }) }
    ) { padding ->

        Column(
            modifier = Modifier
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {

            OutlinedTextField(value = customerName, onValueChange = { customerName = it }, label = { Text("Customer Name (optional)") }, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(value = customerPhone, onValueChange = { customerPhone = it }, label = { Text("Customer Phone (optional)") }, modifier = Modifier.fillMaxWidth())
            
            Spacer(Modifier.height(16.dp))
            
            if (gstEnabled) {
                Text("GST billing enabled", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodyMedium)
            } else {
                Text("GST billing not applicable", color = MaterialTheme.colorScheme.outline)
            }
            Spacer(Modifier.height(16.dp))

            Text("Items", style = MaterialTheme.typography.titleMedium)
            items.forEachIndexed { index, item ->
                InvoiceItemRow(
                    item = item,
                    products = products,
                    onRemove = { items.removeAt(index) },
                    onItemChange = { updatedItem -> items[index] = updatedItem },
                    gstEnabled = gstEnabled
                )
            }
            Spacer(Modifier.height(8.dp))
            Button(onClick = { items.add(InvoiceItemUi(gstRate = if(gstEnabled) 5f else 0f)) }, modifier = Modifier.fillMaxWidth()) {
                Text("+ Add Item")
            }
            
            Spacer(Modifier.height(24.dp))
            
            val subTotal = items.sumOf { it.quantity * it.rate }
            val gstTotal = items.sumOf {
                val rate = if (it.gstRate == -1f) it.customGstRate ?: 0f else it.gstRate
                ((it.quantity * it.rate) * rate / 100).roundToInt()
            }
            val grandTotal = subTotal + gstTotal

            Text("Sub Total: ₹$subTotal", style = MaterialTheme.typography.bodyLarge)
            if (gstEnabled) {
                Text("GST: ₹$gstTotal", style = MaterialTheme.typography.bodyLarge)
            }
            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            Text("Total: ₹$grandTotal", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            
            Spacer(Modifier.height(16.dp))

            Text("Payment Mode", style = MaterialTheme.typography.titleMedium)
            listOf("CASH", "UPI", "CARD", "BANK").forEach { mode ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = paymentMode == mode, onClick = { paymentMode = mode })
                    Text(mode)
                }
            }

            Spacer(Modifier.height(24.dp))

            Button(
                enabled = items.none { it.productId == null } && items.isNotEmpty() && !saving,
                onClick = {
                    val request = CreateInvoiceRequest(
                        shopId = shopId,
                        customerName = customerName.takeIf { it.isNotBlank() },
                        customerPhone = customerPhone.takeIf { it.isNotBlank() },
                        paymentMode = paymentMode,
                        items = items.map {
                            val appliedGstRate = if (it.gstRate == -1f) it.customGstRate ?: 0f else it.gstRate
                            val lineBase = it.quantity * it.rate
                            val gstAmount = (lineBase * appliedGstRate / 100).roundToInt()
                            InvoiceItemRequest(
                                shopProductId = it.productId!!,
                                quantity = it.quantity,
                                rate = it.rate,
                                gstRate = appliedGstRate,
                                gstAmount = gstAmount,
                                lineTotal = lineBase + gstAmount
                            )
                        }
                    )
                    viewModel.createInvoice(
                        request = request, 
                        onSuccess = { navController.popBackStack() }, 
                        onError = { /* TODO: Show snackbar */ }
                    )
                },
                modifier = Modifier.fillMaxWidth().height(48.dp)
            ) {
                if (saving) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Text("Create Invoice")
                }
            }
        }
    }
}
