package com.aiyal.mobibix.ui.features.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aiyal.mobibix.ui.components.SectionHeader
import com.aiyal.mobibix.ui.components.StatCard
import com.aiyal.mobibix.ui.components.AuroraBackground

@Composable
fun StaffDashboardScreen(
    state: StaffDashboardState,
    onOpenDrawer: () -> Unit = {}
) {
// We need to check StatCard implementation later, but for now wrap everything.
    Box(modifier = Modifier.fillMaxSize()) {
        AuroraBackground()
        
        if (state.loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item(span = { GridItemSpan(maxLineSpan) }) { SectionHeader("Jobs") }
                item { StatCard("In Progress", state.inProgress.toString()) }
                item { StatCard("Waiting", state.waitingParts.toString()) }
                item { StatCard("Ready", state.ready.toString()) }
                item { StatCard("Delivered", state.deliveredToday.toString()) }
        
                item(span = { GridItemSpan(maxLineSpan) }) { SectionHeader("Stock Alerts") }
                item { StatCard("Negative", state.negativeStock.toString()) }
                item { StatCard("Zero", state.zeroStock.toString()) }
            }
        }
    }
}
