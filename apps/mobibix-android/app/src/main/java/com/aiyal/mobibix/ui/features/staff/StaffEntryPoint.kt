package com.aiyal.mobibix.ui.features.staff

import com.aiyal.mobibix.data.network.StaffApi
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@EntryPoint
@InstallIn(SingletonComponent::class)
interface StaffEntryPoint {
    fun staffApi(): StaffApi
}
