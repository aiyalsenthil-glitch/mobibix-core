package com.aiyal.mobibix.ui.features.billing

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import com.aiyal.mobibix.data.network.SubscriptionDetails
import com.aiyal.mobibix.data.network.Plan
import com.aiyal.mobibix.data.network.VerifyPaymentRequest
import com.aiyal.mobibix.core.payment.RazorpayHelper
import com.aiyal.mobibix.ui.theme.MobiBixTheme
import android.app.Activity
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import java.text.NumberFormat
import java.util.Locale
import kotlinx.coroutines.flow.collectLatest

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BillingScreen(
    navController: NavController,
    viewModel: BillingViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currencyFormatter = NumberFormat.getCurrencyInstance(Locale.Builder().setLanguage("en").setRegion("IN").build())
    val context = LocalContext.current
    val activity = context as? Activity

    val REMOVED_PAYMENT_INFRAHelper = remember(activity) {
        activity?.let {
            RazorpayHelper(
                activity = it,
                onPaymentSuccess = { paymentId ->
                    // We need orderId from state or event
                },
                onPaymentError = { code, msg ->
                    // Handle error
                }
            )
        }
    }

    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    // Show grace period dialog automatically when PAST_DUE or ≤ 3 days left
    val gracePlan = uiState.currentPlan
    var showGraceDialog by remember { mutableStateOf(false) }
    LaunchedEffect(gracePlan) {
        if (gracePlan != null) {
            val isPastDue = gracePlan.subscriptionStatus == "PAST_DUE"
            val isExpiringSoon = gracePlan.daysLeft in 0..3
            if (isPastDue || isExpiringSoon) {
                showGraceDialog = true
            }
        }
    }

    if (showGraceDialog && gracePlan != null) {
        GracePeriodDialog(
            daysLeft = gracePlan.daysLeft,
            isPastDue = gracePlan.subscriptionStatus == "PAST_DUE",
            onGoToBilling = { /* Already on billing screen */ },
            onDismiss = { showGraceDialog = false }
        )
    }

    LaunchedEffect(viewModel.events) {
        viewModel.events.collectLatest { event ->
            when (event) {
                is BillingEvent.StartPayment -> {
                    REMOVED_PAYMENT_INFRAHelper?.startPayment(
                        key = event.key,
                        orderId = event.orderId,
                        amount = event.amount,
                        currency = "INR"
                    )
                    // Note: PaymentResultListener should ideally call ViewModel verify.
                    // But Razorpay standard SDK uses Activity-level callbacks.
                    // We might need to handle onPaymentSuccess in the Activity or a custom listener.
                }
            }
        }
    }

    // Optimization: Handle the success/error in a more robust way since 
    // Razorpay Standard SDK requires the Activity to implement PaymentResultListener.
    // Our RazorpayHelper implements it but the SDK calls the Activity's implementation.


    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Billing & Subscription") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
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
                    SubscriptionStatusCard(
                        details = plan,
                        autoRenewLoading = uiState.autoRenewLoading,
                        onToggleAutoRenew = { viewModel.toggleAutoRenew() }
                    )
                }
            }

            // Cycle & Billing Type Selectors
            item {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CycleSelector(
                        selectedCycle = uiState.selectedCycle,
                        onCycleSelected = { viewModel.selectCycle(it) }
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    BillingTypeSelector(
                        selectedType = uiState.billingType,
                        onTypeSelected = { viewModel.selectBillingType(it) }
                    )
                }
            }

            // Available Plans Section
            item {
                Text("Available Plans", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                uiState.availablePlans.forEach { plan ->
                    if (plan.id != uiState.currentPlan?.subscriptionId) {
                        PlanItem(
                            plan = plan,
                            formatter = currencyFormatter,
                            selectedCycle = uiState.selectedCycle
                        ) {
                            viewModel.upgradePlan(plan.id, uiState.selectedCycle, uiState.billingType)
                        }
                        Spacer(modifier = Modifier.height(12.dp))
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
fun SubscriptionStatusCard(
    details: SubscriptionDetails,
    autoRenewLoading: Boolean,
    onToggleAutoRenew: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        ),
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Current Plan",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = details.plan,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                }
                
                Surface(
                    color = when (details.subscriptionStatus) {
                        "ACTIVE" -> Color(0xFFE8F5E9)
                        "TRIAL" -> Color(0xFFE3F2FD)
                        "PAST_DUE" -> Color(0xFFFFF3E0)
                        else -> Color(0xFFFFEBEE)
                    },
                    shape = CircleShape
                ) {
                    Text(
                        text = details.subscriptionStatus,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = when (details.subscriptionStatus) {
                            "ACTIVE" -> Color(0xFF2E7D32)
                            "TRIAL" -> Color(0xFF1976D2)
                            "PAST_DUE" -> Color(0xFFEF6C00)
                            else -> Color(0xFFC62828)
                        }
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = if (details.isTrial) "Trial ends in ${details.daysLeft} days" else "Renews in ${details.daysLeft} days",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Auto Renewal",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                if (autoRenewLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                } else {
                    Switch(
                        checked = details.autoRenew,
                        onCheckedChange = { onToggleAutoRenew() },
                        enabled = !details.isTrial
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Text(
                text = "Usage Limits",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                LimitItem("Shops", details.maxShops)
                LimitItem("Staff", details.maxStaff)
                LimitItem("Members", details.memberLimit)
            }
        }
    }
}

@Composable
fun LimitItem(label: String, limit: Int?) {
    Column {
        Text(text = label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            text = limit?.toString() ?: "Unlimited",
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun CycleSelector(selectedCycle: String, onCycleSelected: (String) -> Unit) {
    Row(
        modifier = Modifier
            .background(MaterialTheme.colorScheme.surfaceVariant, CircleShape)
            .padding(4.dp)
    ) {
        val cycles = listOf("MONTHLY", "YEARLY")
        cycles.forEach { cycle ->
            val selected = selectedCycle == cycle
            val color = if (selected) MaterialTheme.colorScheme.primary else Color.Transparent
            val textColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
            
            Surface(
                modifier = Modifier.clickable { onCycleSelected(cycle) },
                color = color,
                shape = CircleShape
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = cycle.lowercase().replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.labelLarge,
                        color = textColor
                    )
                    if (cycle == "YEARLY") {
                        Spacer(modifier = Modifier.width(4.dp))
                        Surface(
                            color = Color(0xFF4CAF50),
                            shape = CircleShape
                        ) {
                            Text(
                                text = "-15%",
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun BillingTypeSelector(selectedType: String, onTypeSelected: (String) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
            .padding(4.dp)
    ) {
        val types = listOf("AUTOPAY", "MANUAL")
        types.forEach { type ->
            val selected = selectedType == type
            val color = if (selected) MaterialTheme.colorScheme.surface else Color.Transparent
            val textColor = if (selected) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
            
            Surface(
                modifier = Modifier.weight(1f).clickable { onTypeSelected(type) },
                color = color,
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = if (type == "AUTOPAY") "AutoPay (Recurrent)" else "Pay Manually",
                    modifier = Modifier.padding(vertical = 8.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    style = MaterialTheme.typography.labelLarge,
                    color = textColor
                )
            }
        }
    }
}

@Composable
fun PlanItem(plan: Plan, formatter: NumberFormat, selectedCycle: String, onUpgrade: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(plan.displayName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    plan.tagline?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                    }
                }
                val cycleData = plan.billingCycles.find { it.cycle == selectedCycle } ?: plan.billingCycles.first()
                Text(formatter.format(cycleData.price), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
            }
            Spacer(modifier = Modifier.height(4.dp))
            if (selectedCycle == "YEARLY") {
                Text("Billed annually", style = MaterialTheme.typography.labelSmall, color = Color(0xFF4CAF50))
            }
            Spacer(modifier = Modifier.height(8.dp))
            plan.features.take(3).forEach { feature ->
                Text("• $feature", style = MaterialTheme.typography.bodySmall)
            }
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = onUpgrade,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(if (plan.canUpgrade) "Upgrade" else "Switch")
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
