package com.enflame.happy.ui.components.acp

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.enflame.happy.domain.model.acp.AcpConfig
import com.enflame.happy.domain.model.acp.AcpConfigField
import com.enflame.happy.domain.model.acp.AcpConfigFieldType

/**
 * Configuration panel presented in a ModalBottomSheet.
 *
 * Displays session configuration fields with appropriate Material 3
 * form controls for each field type:
 * - TEXT: OutlinedTextField
 * - BOOLEAN: Switch
 * - SELECT: ExposedDropdownMenuBox
 *
 * @param config The configuration data to display.
 * @param onFieldChanged Callback when a field value changes (fieldId, newValue).
 * @param onDismiss Callback when the bottom sheet is dismissed.
 * @param modifier Optional modifier for the composable.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcpConfigPanel(
    config: AcpConfig,
    onFieldChanged: (String, String) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        modifier = modifier.semantics {
            contentDescription = "Configuration panel. ${config.fields.size} settings."
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 16.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Configuration",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            // Config fields
            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.padding(bottom = 24.dp)
            ) {
                config.fields.forEach { field ->
                    ConfigFieldItem(
                        field = field,
                        onValueChanged = { newValue ->
                            onFieldChanged(field.id, newValue)
                        }
                    )
                }
            }
        }
    }
}

/**
 * Renders a single configuration field with the appropriate control type.
 */
@Composable
private fun ConfigFieldItem(
    field: AcpConfigField,
    onValueChanged: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        when (field.type) {
            AcpConfigFieldType.TEXT -> TextConfigField(field, onValueChanged)
            AcpConfigFieldType.BOOLEAN -> BooleanConfigField(field, onValueChanged)
            AcpConfigFieldType.SELECT -> SelectConfigField(field, onValueChanged)
        }

        // Description
        field.description?.let { desc ->
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = desc,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
            )
        }
    }
}

/**
 * Text input field using OutlinedTextField.
 */
@Composable
private fun TextConfigField(
    field: AcpConfigField,
    onValueChanged: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = field.value,
        onValueChange = onValueChanged,
        label = { Text(field.label) },
        singleLine = true,
        modifier = modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "${field.label}: ${field.value}"
            }
    )
}

/**
 * Boolean toggle using Switch.
 */
@Composable
private fun BooleanConfigField(
    field: AcpConfigField,
    onValueChanged: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val isChecked = field.value.equals("true", ignoreCase = true)

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "${field.label}: ${if (isChecked) "enabled" else "disabled"}"
            }
    ) {
        Text(
            text = field.label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f)
        )
        Switch(
            checked = isChecked,
            onCheckedChange = { checked ->
                onValueChanged(checked.toString())
            }
        )
    }
}

/**
 * Select field using ExposedDropdownMenuBox.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SelectConfigField(
    field: AcpConfigField,
    onValueChanged: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "${field.label}: ${field.value}"
            }
    ) {
        OutlinedTextField(
            value = field.value,
            onValueChange = {},
            readOnly = true,
            label = { Text(field.label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            field.options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option) },
                    onClick = {
                        onValueChanged(option)
                        expanded = false
                    }
                )
            }
        }
    }
}
