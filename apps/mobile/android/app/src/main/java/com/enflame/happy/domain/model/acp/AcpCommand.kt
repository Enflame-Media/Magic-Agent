package com.enflame.happy.domain.model.acp

import kotlinx.serialization.Serializable

/**
 * Input specification for an available command.
 */
@Serializable
data class AcpCommandInput(
    val type: String,
    val hint: String,
)

/**
 * Information about an available slash command.
 */
@Serializable
data class AcpAvailableCommand(
    val name: String,
    val description: String,
    val input: AcpCommandInput? = null,
)
