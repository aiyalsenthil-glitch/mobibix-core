package com.aiyal.mobibix.ui.features.intelligence

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatMessage(
    val role: String, // "user" or "assistant"
    val content: String,
    val timestamp: Long = System.currentTimeMillis()
)

data class AiChatUiState(
    val messages: List<ChatMessage> = listOf(
        ChatMessage("assistant", "👋 Hi! I'm your MobiBix AI Assistant. I can help you with:\n• Sales & inventory queries\n• Repair troubleshooting\n• Business insights\n• Product compatibility\n\nWhat can I help you with today?")
    ),
    val inputText: String = "",
    val loading: Boolean = false
)

@HiltViewModel
class AiChatViewModel @Inject constructor() : ViewModel() {

    private val _state = MutableStateFlow(AiChatUiState())
    val state = _state.asStateFlow()

    // Quick action prompts
    val quickActions = listOf(
        "Show today's sales summary",
        "What products are low in stock?",
        "List pending repair jobs",
        "Show top customers this month"
    )

    fun updateInput(text: String) {
        _state.value = _state.value.copy(inputText = text)
    }

    fun sendMessage(shopContext: String? = null) {
        val text = _state.value.inputText.trim()
        if (text.isBlank()) return

        val userMsg = ChatMessage("user", text)
        _state.value = _state.value.copy(
            messages = _state.value.messages + userMsg,
            inputText = "",
            loading = true
        )

        viewModelScope.launch {
            // Simulate AI response — in production calls AI core or backend /ai-chat endpoint
            delay(800)
            val reply = generateLocalResponse(text)
            _state.value = _state.value.copy(
                messages = _state.value.messages + ChatMessage("assistant", reply),
                loading = false
            )
        }
    }

    private fun generateLocalResponse(message: String): String {
        val lower = message.lowercase()
        return when {
            lower.contains("stock") || lower.contains("inventory") ->
                "📦 To check stock levels, go to **Inventory → Products**. You can filter by low stock or negative stock. The Inventory Intelligence screen also shows shrinkage analysis."
            lower.contains("sales") || lower.contains("invoice") ->
                "💰 You can view all sales from the **Sales** tab. Use the Reports section for detailed sales analysis, profit/loss, and GSTR reports."
            lower.contains("repair") || lower.contains("job") ->
                "🔧 Job cards are managed in the **Repair** tab. You can create, update, and bill repair jobs. Use Repair Knowledge Base for diagnostic checklists."
            lower.contains("customer") ->
                "👥 Customer management is in **Customers**. You can view their purchase history, loyalty points, and set up WhatsApp follow-ups via CRM."
            lower.contains("compatibility") || lower.contains("part") ->
                "🔍 Use the **Compatibility Finder** to search for compatible parts by phone model. It shows both catalog items and your current inventory."
            lower.contains("report") || lower.contains("profit") ->
                "📊 Reports are available under the **Reports** section. You can view Sales, Profit & Loss, Tax (GSTR-1), and Inventory reports."
            lower.contains("expense") ->
                "💸 Track expenses under **Finance → Expenses**. The Expense Intelligence screen shows category breakdowns and monthly trends."
            else ->
                "I understand you're asking about: \"$message\"\n\nFor detailed assistance, please check the relevant section in the app. You can also access:\n• Reports for analytics\n• Settings for configuration\n• WhatsApp for customer outreach"
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiChatScreen(
    navController: NavController,
    viewModel: AiChatViewModel = androidx.hilt.navigation.compose.hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val listState = rememberLazyListState()

    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) {
            listState.animateScrollToItem(state.messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("AI Assistant", fontWeight = FontWeight.Bold)
                        Text("MobiBix Intelligence", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        bottomBar = {
            Column(
                modifier = Modifier
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = state.inputText,
                        onValueChange = { viewModel.updateInput(it) },
                        placeholder = { Text("Ask anything...", fontSize = 14.sp) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(24.dp),
                        singleLine = true
                    )
                    FloatingActionButton(
                        onClick = { viewModel.sendMessage() },
                        modifier = Modifier.size(48.dp),
                        containerColor = if (state.inputText.isNotBlank()) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send",
                            tint = if (state.inputText.isNotBlank()) Color.White else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Spacer(Modifier.height(4.dp))
            }
        }
    ) { padding ->
        LazyColumn(
            state = listState,
            modifier = Modifier.padding(padding).fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Quick actions at top if no user messages yet
            if (state.messages.size == 1) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Quick Actions", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.SemiBold)
                        viewModel.quickActions.forEach { action ->
                            OutlinedButton(
                                onClick = {
                                    viewModel.updateInput(action)
                                    viewModel.sendMessage()
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(20.dp)
                            ) { Text(action, fontSize = 13.sp) }
                        }
                    }
                }
            }

            items(state.messages) { msg ->
                ChatBubble(msg)
            }

            if (state.loading) {
                item {
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Surface(
                            shape = RoundedCornerShape(16.dp, 16.dp, 16.dp, 4.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.padding(end = 40.dp)
                        ) {
                            Row(modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                                repeat(3) {
                                    Box(modifier = Modifier.size(6.dp).background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f), RoundedCornerShape(50)))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChatBubble(msg: ChatMessage) {
    val isUser = msg.role == "user"
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Surface(
            shape = if (isUser) RoundedCornerShape(16.dp, 16.dp, 4.dp, 16.dp)
                    else RoundedCornerShape(16.dp, 16.dp, 16.dp, 4.dp),
            color = if (isUser) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
            modifier = if (isUser) Modifier.padding(start = 40.dp) else Modifier.padding(end = 40.dp)
        ) {
            Text(
                msg.content,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                fontSize = 14.sp,
                color = if (isUser) Color.White else MaterialTheme.colorScheme.onSurface,
                lineHeight = 20.sp
            )
        }
    }
}
