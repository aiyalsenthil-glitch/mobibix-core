package com.aiyal.mobibix.ui.features.print

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.NumberFormat
import java.util.Locale

@Composable
fun JobCardPrintLayout(
    printData: JobCardPrintData
) {
    Column(
        modifier = Modifier
            .width(360.dp) // fixed print width
            .background(MaterialTheme.colorScheme.surface)
            .padding(12.dp)
    ) {
        HeaderSection(printData)
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = MaterialTheme.colorScheme.outlineVariant)
        CustomerAndIssueSection(printData)
        Spacer(Modifier.height(8.dp))
        DeviceSection(printData)
        Spacer(Modifier.height(8.dp))
        FinancialSection(printData)
        Spacer(Modifier.height(8.dp))
        TermsAndQrSection(printData)
        Spacer(Modifier.height(24.dp))
        SignatureSection()
    }
}

@Composable
fun HeaderSection(printData: JobCardPrintData) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top
    ) {
        Column {
            Text(printData.shopName, style = MaterialTheme.typography.headlineSmall)
            Text("Phone: ${printData.shopPhone}", style = MaterialTheme.typography.bodyMedium)
        }

        Column(horizontalAlignment = Alignment.End) {
            Text("Job Sheet", style = MaterialTheme.typography.titleMedium)
            Text(
                printData.jobNumber,
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
            )
        }
    }
}

@Composable
fun CustomerAndIssueSection(printData: JobCardPrintData) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {

        BoxedSection(
            title = "CUSTOMER INFORMATION",
            modifier = Modifier.weight(1f)
        ) {
            KeyValue("Name", printData.customerName)
            KeyValue("Phone", printData.customerPhone)
            KeyValue("Alt Phone", printData.customerAltPhone)
        }

        Spacer(Modifier.width(8.dp))

        BoxedSection(
            title = "ISSUE & CONDITION",
            modifier = Modifier.weight(1f)
        ) {
            Text("Complaint", style = MaterialTheme.typography.labelLarge)
            Text(printData.complaint, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(4.dp))
            Text("Observed Physical Condition", style = MaterialTheme.typography.labelLarge)
            Text(printData.physicalCondition.ifBlank { "—" }, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
fun DeviceSection(printData: JobCardPrintData) {
    BoxedSection(title = "DEVICE INFORMATION") {
        KeyValue("Type", printData.deviceType)
        KeyValue("Brand & Model", "${printData.deviceBrand} ${printData.deviceModel}")
        KeyValue("IMEI / Serial", printData.deviceSerial)
    }
}

@Composable
fun FinancialSection(printData: JobCardPrintData) {
    val formatter = NumberFormat.getCurrencyInstance(Locale.Builder().setLanguage("en").setRegion("IN").build())
    BoxedSection(title = "FINANCIALS & DELIVERY") {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Estimated: ${formatter.format(printData.estimatedCost)}", style = MaterialTheme.typography.bodyMedium)
            Text("|", color = MaterialTheme.colorScheme.outlineVariant)
            Text("Advance: ${formatter.format(printData.advancePaid)}", style = MaterialTheme.typography.bodyMedium)
            Text("|", color = MaterialTheme.colorScheme.outlineVariant)
            Text(
                "Balance: ${formatter.format(printData.balanceDue)}",
                color = Color(0xFF2E7D32), // Retaining specific green for semantic meaning
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(Modifier.height(6.dp))
        KeyValue("Est. Delivery", printData.estimatedDelivery)
    }
}

@Composable
fun TermsAndQrSection(printData: JobCardPrintData) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {

        Column(Modifier.weight(1f)) {
            Text("Terms & Conditions", style = MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(4.dp))
            val terms = printData.terms.ifEmpty {
                listOf(
                    "Repair estimate may change after diagnosis.",
                    "Shop is not responsible for data loss.",
                    "Advance amount is non-refundable."
                )
            }

            terms.forEachIndexed { i, term ->
                Text("${i + 1}. $term", style = MaterialTheme.typography.bodySmall)
            }
        }

        Spacer(Modifier.width(8.dp))

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Image(
                bitmap = printData.qrBitmap.asImageBitmap(),
                contentDescription = "Job QR Code",
                modifier = Modifier.size(90.dp)
            )
            Spacer(Modifier.height(2.dp))
            Text("Scan to track job status", style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
fun SignatureSection() {
    Row(
        Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
            HorizontalDivider(modifier = Modifier.width(120.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("Customer Signature", style = MaterialTheme.typography.bodySmall)
        }
        Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
            HorizontalDivider(modifier = Modifier.width(120.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("Staff Signature", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
fun BoxedSection(
    title: String,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    OutlinedCard(
        modifier = modifier,
        shape = MaterialTheme.shapes.medium
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = MaterialTheme.colorScheme.outline)
            content()
        }
    }
}

@Composable
fun KeyValue(key: String, value: String?) {
    Row {
        Text("$key: ", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
        Text(value?.takeIf { it.isNotBlank() } ?: "—", style = MaterialTheme.typography.bodyMedium)
    }
}
