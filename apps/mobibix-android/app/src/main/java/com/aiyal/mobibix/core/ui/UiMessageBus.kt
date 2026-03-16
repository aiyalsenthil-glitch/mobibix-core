package com.aiyal.mobibix.core.ui

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

enum class UiMessageType { ERROR, SUCCESS, INFO }

data class UiMessage(
    val text: String,
    val type: UiMessageType = UiMessageType.ERROR
)

@Singleton
class UiMessageBus @Inject constructor() {
    private val _messages = MutableSharedFlow<UiMessage>(extraBufferCapacity = 4)
    val messages = _messages.asSharedFlow()

    fun showError(message: String) {
        _messages.tryEmit(UiMessage(message, UiMessageType.ERROR))
    }

    fun showSuccess(message: String) {
        _messages.tryEmit(UiMessage(message, UiMessageType.SUCCESS))
    }

    fun showInfo(message: String) {
        _messages.tryEmit(UiMessage(message, UiMessageType.INFO))
    }
}
