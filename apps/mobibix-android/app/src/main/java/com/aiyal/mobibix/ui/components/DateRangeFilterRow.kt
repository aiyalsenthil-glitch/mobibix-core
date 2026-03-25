package com.aiyal.mobibix.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DateRangeFilterRow(
    startDate: String,
    endDate: String,
    onRangeSelected: (start: String, end: String) -> Unit,
    modifier: Modifier = Modifier
) {
    var showStartPicker by remember { mutableStateOf(false) }
    var showEndPicker by remember { mutableStateOf(false) }

    val fmt = DateTimeFormatter.ISO_DATE

    if (showStartPicker) {
        val initialMs = runCatching {
            LocalDate.parse(startDate, fmt).atStartOfDay(ZoneId.of("UTC")).toInstant().toEpochMilli()
        }.getOrDefault(System.currentTimeMillis())

        val pickerState = rememberDatePickerState(initialSelectedDateMillis = initialMs)
        DatePickerDialog(
            onDismissRequest = { showStartPicker = false },
            confirmButton = {
                TextButton(onClick = {
                    pickerState.selectedDateMillis?.let { ms ->
                        val selected = Instant.ofEpochMilli(ms)
                            .atZone(ZoneId.of("UTC")).toLocalDate().format(fmt)
                        onRangeSelected(selected, endDate)
                    }
                    showStartPicker = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { showStartPicker = false }) { Text("Cancel") } }
        ) {
            DatePicker(state = pickerState)
        }
    }

    if (showEndPicker) {
        val initialMs = runCatching {
            LocalDate.parse(endDate, fmt).atStartOfDay(ZoneId.of("UTC")).toInstant().toEpochMilli()
        }.getOrDefault(System.currentTimeMillis())

        val pickerState = rememberDatePickerState(initialSelectedDateMillis = initialMs)
        DatePickerDialog(
            onDismissRequest = { showEndPicker = false },
            confirmButton = {
                TextButton(onClick = {
                    pickerState.selectedDateMillis?.let { ms ->
                        val selected = Instant.ofEpochMilli(ms)
                            .atZone(ZoneId.of("UTC")).toLocalDate().format(fmt)
                        onRangeSelected(startDate, selected)
                    }
                    showEndPicker = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { showEndPicker = false }) { Text("Cancel") } }
        ) {
            DatePicker(state = pickerState)
        }
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(
            Icons.Default.DateRange,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary
        )
        OutlinedButton(
            onClick = { showStartPicker = true },
            modifier = Modifier.weight(1f)
        ) {
            Text(startDate, style = MaterialTheme.typography.labelMedium)
        }
        Text("→", style = MaterialTheme.typography.bodyMedium)
        OutlinedButton(
            onClick = { showEndPicker = true },
            modifier = Modifier.weight(1f)
        ) {
            Text(endDate, style = MaterialTheme.typography.labelMedium)
        }
    }
}
