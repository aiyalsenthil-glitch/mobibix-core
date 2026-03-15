package com.aiyal.mobibix.ui.features.knowledge

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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
import com.aiyal.mobibix.data.network.FaultType
import com.aiyal.mobibix.data.network.RepairNote

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RepairKnowledgeScreen(
    navController: NavController,
    viewModel: KnowledgeViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var showAddNote by remember { mutableStateOf(false) }
    var newNoteContent by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { viewModel.loadFaultTypes() }

    if (showAddNote && state.selectedFaultType != null) {
        AlertDialog(
            onDismissRequest = { showAddNote = false },
            title = { Text("Add Repair Note") },
            text = {
                Column {
                    Text("Fault: ${state.selectedFaultType!!.name}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = newNoteContent,
                        onValueChange = { newNoteContent = it },
                        label = { Text("Your repair tip or finding") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.submitNote(state.selectedFaultType!!.id, newNoteContent) {
                            showAddNote = false
                            newNoteContent = ""
                        }
                    },
                    enabled = newNoteContent.isNotBlank() && !state.submitting
                ) { Text("Submit") }
            },
            dismissButton = { OutlinedButton(onClick = { showAddNote = false }) { Text("Cancel") } }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Repair Knowledge Base", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { navController.popBackStack() }) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") } },
                actions = {
                    if (state.selectedFaultType != null) {
                        IconButton(onClick = { showAddNote = true }) {
                            Icon(Icons.Default.Add, contentDescription = "Add Note")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Row(modifier = Modifier.padding(padding).fillMaxSize()) {
            // Fault type list (left panel)
            LazyColumn(
                modifier = Modifier.width(130.dp).fillMaxHeight().background(MaterialTheme.colorScheme.surfaceVariant),
                contentPadding = PaddingValues(vertical = 8.dp)
            ) {
                if (state.loading) {
                    item { Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(modifier = Modifier.size(24.dp)) } }
                }
                items(state.faultTypes) { ft ->
                    val isSelected = state.selectedFaultType?.id == ft.id
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f) else Color.Transparent)
                            .clickable { viewModel.selectFaultType(ft) }
                            .padding(horizontal = 12.dp, vertical = 12.dp)
                    ) {
                        Text(
                            ft.name,
                            fontSize = 13.sp,
                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                            color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }

            // Content panel
            Column(modifier = Modifier.weight(1f).fillMaxHeight()) {
                if (state.selectedFaultType == null) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Build, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
                            Spacer(Modifier.height(8.dp))
                            Text("Select a fault type", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(12.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Checklist
                        state.checklist?.let { checklist ->
                            item {
                                Card(
                                    shape = RoundedCornerShape(10.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f))
                                ) {
                                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("Diagnostic Checklist", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)
                                        checklist.steps.sortedBy { it.order }.forEachIndexed { idx, step ->
                                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Top) {
                                                Box(
                                                    modifier = Modifier.size(20.dp).background(MaterialTheme.colorScheme.primary, CircleShape),
                                                    contentAlignment = Alignment.Center
                                                ) { Text("${idx + 1}", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold) }
                                                Text(step.stepText, fontSize = 13.sp, modifier = Modifier.weight(1f))
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Notes
                        if (state.notes.isNotEmpty()) {
                            item { Text("Community Notes", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                            items(state.notes) { note ->
                                RepairNoteCard(note,
                                    onHelpful = { viewModel.voteNote(note.id, true) },
                                    onNotHelpful = { viewModel.voteNote(note.id, false) }
                                )
                            }
                        } else {
                            item {
                                Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                                    Text("No notes yet. Be the first to add one!", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
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
private fun RepairNoteCard(note: RepairNote, onHelpful: () -> Unit, onNotHelpful: () -> Unit) {
    val sourceColor = when (note.source) {
        "SYSTEM" -> Color(0xFF3B82F6)
        "ADMIN" -> Color(0xFF8B5CF6)
        else -> Color(0xFF6B7280)
    }
    Card(
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Surface(shape = RoundedCornerShape(20.dp), color = sourceColor.copy(alpha = 0.12f)) {
                    Text(note.source, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), fontSize = 10.sp, color = sourceColor, fontWeight = FontWeight.SemiBold)
                }
                if (note.status == "APPROVED") {
                    Icon(Icons.Default.CheckCircle, contentDescription = "Approved", tint = Color(0xFF00C896), modifier = Modifier.size(16.dp))
                }
            }
            Text(note.content, fontSize = 13.sp, lineHeight = 18.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onHelpful, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) {
                    Icon(Icons.Default.ThumbUp, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("${note.helpfulCount}", fontSize = 12.sp)
                }
                TextButton(onClick = onNotHelpful, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) {
                    Icon(Icons.Default.ThumbDown, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("${note.notHelpfulCount}", fontSize = 12.sp)
                }
            }
        }
    }
}
