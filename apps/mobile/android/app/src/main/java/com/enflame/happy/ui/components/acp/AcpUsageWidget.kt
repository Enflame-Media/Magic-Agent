package com.enflame.happy.ui.components.acp

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.enflame.happy.domain.model.acp.AcpUsage
import java.text.NumberFormat
import java.util.Currency
import java.util.Locale
import kotlin.math.roundToInt

/**
 * Displays context window usage with a LinearProgressIndicator.
 *
 * The progress bar transitions through colors based on fill percentage:
 * - Green (0-60%): Safe usage range
 * - Yellow (60-85%): Warning range
 * - Red (85-100%): Critical range
 *
 * Also displays formatted token counts and optional cost information.
 *
 * @param usage The usage data to display.
 * @param modifier Optional modifier for the composable.
 */
@Composable
fun AcpUsageWidget(
    usage: AcpUsage,
    modifier: Modifier = Modifier
) {
    val percentage = if (usage.tokensTotal > 0) {
        (usage.tokensUsed.toFloat() / usage.tokensTotal.toFloat()).coerceIn(0f, 1f)
    } else {
        0f
    }
    val percentDisplay = (percentage * 100).roundToInt()
    val barColor = getBarColor(percentage)

    Card(
        modifier = modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "Context window usage: $percentDisplay percent. " +
                    "${formatTokens(usage.tokensUsed)} of ${formatTokens(usage.tokensTotal)} tokens used."
            },
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector = Icons.Default.Speed,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Context Window",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = "$percentDisplay%",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = barColor
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Progress bar
            LinearProgressIndicator(
                progress = { percentage },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp),
                color = barColor,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
                strokeCap = StrokeCap.Round
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Token counts and cost
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${formatTokens(usage.tokensUsed)} / ${formatTokens(usage.tokensTotal)}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                usage.cost?.let { cost ->
                    Text(
                        text = formatCost(cost.amount, cost.currency),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
    }
}

/**
 * Returns the progress bar color based on fill percentage.
 * Green (0-60%), Yellow (60-85%), Red (85-100%).
 */
private fun getBarColor(percentage: Float): Color {
    return when {
        percentage >= 0.85f -> Color(0xFFFF3B30) // Red
        percentage >= 0.60f -> Color(0xFFFF9500) // Yellow/Orange
        else -> Color(0xFF34C759) // Green
    }
}

/**
 * Formats a token count for compact display.
 * Examples: 1234 -> "1.2K", 150000 -> "150K", 1500000 -> "1.5M"
 */
private fun formatTokens(tokens: Long): String {
    return when {
        tokens >= 1_000_000 -> "${(tokens / 1_000_000.0).let { "%.1f".format(it) }}M"
        tokens >= 1_000 -> "${(tokens / 1_000.0).let { "%.1f".format(it) }}K"
        else -> NumberFormat.getNumberInstance(Locale.getDefault()).format(tokens)
    }
}

/**
 * Formats cost with currency symbol using locale-aware formatting.
 */
private fun formatCost(amount: Double, currencyCode: String): String {
    return try {
        val format = NumberFormat.getCurrencyInstance(Locale.US)
        format.currency = Currency.getInstance(currencyCode)
        format.minimumFractionDigits = 2
        format.maximumFractionDigits = 4
        format.format(amount)
    } catch (_: Exception) {
        "%.2f %s".format(amount, currencyCode)
    }
}
