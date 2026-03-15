package com.aiyal.mobibix.ui.features.finance.vouchers

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.PaymentVoucher
import com.aiyal.mobibix.data.network.VoucherType
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VoucherListScreen(
    navController: NavController,
    viewModel: VoucherViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale.Builder().setLanguage("en").setRegion("IN").build())

    LaunchedEffect(Unit) {
        viewModel.loadVouchers()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Payment Vouchers") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { navController.navigate("create_voucher") }) {
                Icon(Icons.Default.Add, contentDescription = "Add Voucher")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (uiState.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            if (uiState.error != null) {
                Text(
                    text = uiState.error!!,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(16.dp)
                )
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(uiState.vouchers) { voucher ->
                    VoucherItemCard(voucher, currencyFormatter)
                }
            }
        }
    }
}

@Composable
fun VoucherItemCard(voucher: PaymentVoucher, formatter: NumberFormat) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                VoucherTypeChip(voucher.voucherType)
                Text(
                    text = formatter.format(voucher.amount),
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.error
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            if (!voucher.narration.isNullOrBlank()) {
                Text(text = voucher.narration, style = MaterialTheme.typography.bodyMedium)
            }
            if (!voucher.expenseCategory.isNullOrBlank()) {
                Text(text = "Category: ${voucher.expenseCategory}", style = MaterialTheme.typography.labelSmall)
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = "ID: ${voucher.voucherId}", style = MaterialTheme.typography.labelSmall)
                Text(text = voucher.date.substring(0, 10), style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
fun VoucherTypeChip(type: VoucherType) {
    val color = when (type) {
        VoucherType.SUPPLIER -> Color(0xFF2196F3)
        VoucherType.EXPENSE -> Color(0xFFFFA000)
        VoucherType.SALARY -> Color(0xFF9C27B0)
        VoucherType.ADJUSTMENT -> Color.Gray
    }
    Surface(
        color = color.copy(alpha = 0.1f),
        shape = MaterialTheme.shapes.small,
        border = androidx.compose.foundation.BorderStroke(1.dp, color)
    ) {
        Text(
            text = type.name,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color
        )
    }
}
