package com.enflame.happy.domain.model.acp

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * A session configuration option and its current state.
 *
 * Currently only "select" type is defined by the ACP specification.
 */
@Serializable
data class AcpConfigOption(
    val type: String,
    val id: String,
    val name: String,
    val description: String? = null,
    val category: String? = null,
    val currentValue: String,
    val options: JsonElement,
)
