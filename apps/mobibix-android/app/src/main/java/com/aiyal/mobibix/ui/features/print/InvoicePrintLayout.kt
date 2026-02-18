package com.aiyal.mobibix.ui.features.print

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.NumberFormat
import java.util.Locale

@Composable
fun InvoicePrintLayout(
    data: InvoicePrintData
) {
    val formatter = NumberFormat.getCurrencyInstance(Locale("en", "IN"))
    
    Column(
        modifier = Modifier
            .width(420.dp) // Adjusted for more detail
            .background(Color.White)
            .padding(24.dp)
    ) {
        // Header
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(modifier = Modifier.weight(1f)) {
                Text(data.shopName, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text(data.shopAddress, style = MaterialTheme.typography.bodySmall)
                Text("Phone: ${data.shopPhone}", style = MaterialTheme.typography.bodySmall)
                data.shopGstin?.let { Text("GSTIN: $it", style = MaterialTheme.typography.bodySmall) }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("TAX INVOICE", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("Inv #: ${data.invoiceNumber}", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary)
                Text("Date: ${data.date}", style = MaterialTheme.typography.bodySmall)
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Customer Info
        Column(modifier = Modifier.fillMaxWidth()) {
            Text("BILL TO", style = MaterialTheme.typography.labelMedium, color = Color.Gray)
            Text(data.customerName ?: "Cash Customer", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            data.customerPhone?.let { Text("Phone: $it", style = MaterialTheme.typography.bodySmall) }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Items Table
        Row(modifier = Modifier.fillMaxWidth().background(Color.LightGray.copy(alpha = 0.3f)).padding(8.dp)) {
            Text("Description", modifier = Modifier.weight(3f), style = MaterialTheme.typography.labelLarge)
            Text("Qty", modifier = Modifier.weight(1f), style = MaterialTheme.typography.labelLarge)
            Text("Rate", modifier = Modifier.weight(1.5f), style = MaterialTheme.typography.labelLarge)
            Text("Total", modifier = Modifier.weight(1.5f), style = MaterialTheme.typography.labelLarge)
        }
        
        data.items.forEach { item ->
            Row(modifier = Modifier.fillMaxWidth().padding(8.dp)) {
                Text(item.productName, modifier = Modifier.weight(3f), style = MaterialTheme.typography.bodyMedium)
                Text(item.quantity.toString(), modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                Text(formatter.format(item.rate), modifier = Modifier.weight(1.5f), style = MaterialTheme.typography.bodyMedium)
                Text(formatter.format(item.total), modifier = Modifier.weight(1.5f), style = MaterialTheme.typography.bodyMedium)
            }
            HorizontalDivider(color = Color.LightGray.copy(alpha = 0.5f))
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Totals
        Column(modifier = Modifier.align(Alignment.End).width(200.dp)) {
            TotalRow("Sub Total", formatter.format(data.subTotal))
            if (data.gstAmount > 0) {
                TotalRow("GST", formatter.format(data.gstAmount))
            }
            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), thickness = 2.dp)
            TotalRow("Grand Total", formatter.format(data.totalAmount), isBold = true)
        }
        
        Spacer(modifier = Modifier.height(40.dp))
        
        // Footer & Terms
        if (!data.invoiceFooter.isNullOrBlank()) {
            Text("Notes:", style = MaterialTheme.typography.labelMedium, color = Color.Gray)
            Text(data.invoiceFooter, style = MaterialTheme.typography.bodySmall)
        }
        
        if (data.terms.isNotEmpty()) {
            Spacer(modifier = Modifier.height(16.dp))
            Text("Terms & Conditions:", style = MaterialTheme.typography.labelMedium, color = Color.Gray)
            data.terms.forEachIndexed { index, term ->
                Text("${index + 1}. $term", style = MaterialTheme.typography.bodySmall, fontSize = 10.sp)
            }
        }
    }
}

@Composable
fun TotalRow(label: String, value: String, isBold: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(text = label, style = if (isBold) MaterialTheme.typography.bodyLarge else MaterialTheme.typography.bodyMedium, fontWeight = if (isBold) FontWeight.Bold else FontWeight.Normal)
        Text(text = value, style = if (isBold) MaterialTheme.typography.bodyLarge else MaterialTheme.typography.bodyMedium, fontWeight = if (isBold) FontWeight.Bold else FontWeight.Normal)
    }
}
