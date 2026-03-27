package com.enflame.happy.domain.model.acp

import kotlinx.serialization.Serializable

/**
 * Cost information for a session (UNSTABLE).
 */
@Serializable
data class AcpCost(
    val amount: Double,
    val currency: String,
)

/**
 * Context window usage information for a session.
 */
data class AcpUsage(
    val used: Int,
    val size: Int,
    val cost: AcpCost?,
)
