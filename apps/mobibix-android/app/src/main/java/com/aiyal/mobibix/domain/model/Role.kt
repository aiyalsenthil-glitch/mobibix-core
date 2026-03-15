package com.aiyal.mobibix.domain.model

data class Role(
    val id: String,
    val name: String,
    val isSystem: Boolean,
    val description: String,
    val permissions: List<String>
)
