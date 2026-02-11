/**
 * Cross-platform ActionSheet utility
 * Uses native ActionSheetIOS on iOS and a custom modal on Android/Web
 */
import { ActionSheetIOS, Platform } from 'react-native';
import { Modal } from '@/modal';
import { t } from '@/text';

export interface ActionSheetOption {
    label: string;
    onPress: () => void;
    destructive?: boolean;
    disabled?: boolean;
}

export interface ActionSheetConfig {
    title?: string;
    message?: string;
    options: ActionSheetOption[];
    cancelLabel?: string;
}

/**
 * Shows a cross-platform action sheet
 * - iOS: Uses native ActionSheetIOS
 * - Android/Web: Uses Modal.alert with button options
 */
export function showActionSheet(config: ActionSheetConfig): void {
    const { title, message, options, cancelLabel = t('common.cancel') } = config;

    // Filter out disabled options for display
    const enabledOptions = options.filter(opt => !opt.disabled);

    if (Platform.OS === 'ios') {
        // Build options array for ActionSheetIOS
        const optionLabels = [...enabledOptions.map(opt => opt.label), cancelLabel];

        // Find destructive button index (if any)
        const destructiveIndex = enabledOptions.findIndex(opt => opt.destructive);

        ActionSheetIOS.showActionSheetWithOptions(
            {
                title,
                message,
                options: optionLabels,
                cancelButtonIndex: optionLabels.length - 1,
                destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
            },
            (buttonIndex) => {
                // Cancel is the last button
                if (buttonIndex === optionLabels.length - 1) {
                    return;
                }

                // Execute the selected action
                const selectedOption = enabledOptions[buttonIndex];
                if (selectedOption) {
                    selectedOption.onPress();
                }
            }
        );
    } else {
        // Android/Web: Use Modal.alert with buttons
        const buttons = [
            ...enabledOptions.map(opt => ({
                text: opt.label,
                style: opt.destructive ? 'destructive' as const : 'default' as const,
                onPress: opt.onPress,
            })),
            {
                text: cancelLabel,
                style: 'cancel' as const,
            },
        ];

        Modal.alert(title || '', message, buttons);
    }
}
