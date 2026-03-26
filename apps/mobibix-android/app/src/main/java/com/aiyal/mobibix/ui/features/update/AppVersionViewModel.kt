package com.aiyal.mobibix.ui.features.update

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.data.network.AppVersionApi
import com.aiyal.mobibix.data.network.AppVersionResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class VersionCheckState {
    object Idle : VersionCheckState()
    data class ForceUpdate(val version: AppVersionResponse) : VersionCheckState()
    data class SoftUpdate(val version: AppVersionResponse) : VersionCheckState()
    object UpToDate : VersionCheckState()
}

@HiltViewModel
class AppVersionViewModel @Inject constructor(
    private val appVersionApi: AppVersionApi
) : ViewModel() {

    private val _state = MutableStateFlow<VersionCheckState>(VersionCheckState.Idle)
    val state = _state.asStateFlow()

    fun checkVersion(currentVersionCode: Int) {
        viewModelScope.launch {
            try {
                val remote = appVersionApi.getVersion()
                // Normalize nullable fields — endpoint may not be deployed yet
                val safe = remote.copy(
                    latestVersionName = remote.latestVersionName ?: "Latest",
                    updateUrl = remote.updateUrl ?: "",
                    releaseNotes = remote.releaseNotes ?: "Bug fixes and performance improvements."
                )
                _state.value = when {
                    currentVersionCode < safe.minVersionCode ->
                        VersionCheckState.ForceUpdate(safe)
                    currentVersionCode < safe.latestVersionCode ->
                        VersionCheckState.SoftUpdate(safe)
                    else ->
                        VersionCheckState.UpToDate
                }
            } catch (_: Exception) {
                // Non-fatal: if version check fails, let the user proceed
                _state.value = VersionCheckState.UpToDate
            }
        }
    }

    fun dismissSoftUpdate() {
        _state.value = VersionCheckState.UpToDate
    }
}
