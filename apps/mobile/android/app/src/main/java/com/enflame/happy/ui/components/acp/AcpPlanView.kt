package com.enflame.happy.ui.components.acp

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoMode
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Pending
import androidx.compose.material.icons.filled.PlaylistAddCheck
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.enflame.happy.domain.model.acp.AcpPlan
import com.enflame.happy.domain.model.acp.AcpPlanStep
import com.enflame.happy.domain.model.acp.AcpPlanStepStatus

/**
 * Displays the agent execution plan with ordered steps and status icons.
 *
 * Each step shows a Material 3 status icon (CheckCircle, Pending, AutoMode,
 * Error, Cancel) with appropriate coloring. Completed and skipped steps
 * use subtle visual styling to de-emphasize them.
 *
 * @param plan The plan data to display.
 * @param modifier Optional modifier for the composable.
 */
@Composable
fun AcpPlanView(
    plan: AcpPlan,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .semantics {
                val completedCount = plan.steps.count {
                    it.status == AcpPlanStepStatus.COMPLETED
                }
                contentDescription = "Plan: ${plan.title}. " +
                    "$completedCount of ${plan.steps.size} steps completed."
            },
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f)
        )
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Plan header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.PlaylistAddCheck,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = MaterialTheme.colorScheme.secondary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = plan.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSecondaryContainer
                )
            }

            // Steps
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                plan.steps.forEachIndexed { index, step ->
                    AcpPlanStepItem(
                        step = step,
                        stepNumber = index + 1
                    )
                }
            }
        }
    }
}

/**
 * A single plan step with its status icon and description.
 */
@Composable
private fun AcpPlanStepItem(
    step: AcpPlanStep,
    stepNumber: Int,
    modifier: Modifier = Modifier
) {
    val (icon, iconColor) = stepStatusVisuals(step.status)
    val textAlpha = when (step.status) {
        AcpPlanStepStatus.COMPLETED, AcpPlanStepStatus.SKIPPED -> 0.6f
        else -> 1f
    }
    val textDecoration = when (step.status) {
        AcpPlanStepStatus.SKIPPED -> TextDecoration.LineThrough
        else -> TextDecoration.None
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "Step $stepNumber: ${step.description}. " +
                    "Status: ${step.status.name.lowercase().replace('_', ' ')}."
            }
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(18.dp),
            tint = iconColor
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = step.description,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = textAlpha),
            textDecoration = textDecoration,
            modifier = Modifier.weight(1f)
        )
    }
}

/**
 * Returns the icon and color for a plan step status.
 */
@Composable
private fun stepStatusVisuals(status: AcpPlanStepStatus): Pair<ImageVector, Color> {
    return when (status) {
        AcpPlanStepStatus.PENDING -> Icons.Default.Pending to
            MaterialTheme.colorScheme.outline
        AcpPlanStepStatus.IN_PROGRESS -> Icons.Default.AutoMode to
            MaterialTheme.colorScheme.primary
        AcpPlanStepStatus.COMPLETED -> Icons.Default.CheckCircle to
            MaterialTheme.colorScheme.primary
        AcpPlanStepStatus.FAILED -> Icons.Default.Error to
            MaterialTheme.colorScheme.error
        AcpPlanStepStatus.SKIPPED -> Icons.Default.Cancel to
            MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
    }
}
