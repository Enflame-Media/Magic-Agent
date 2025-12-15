/**
 * Hook for showing a context menu on long-press of a session item
 *
 * Provides quick access to common session actions:
 * - View session info
 * - Copy session ID
 * - Archive session (connected sessions only)
 * - Delete session (disconnected sessions only)
 *
 * Uses native ActionSheetIOS on iOS and Modal.alert on Android/Web.
 * Triggers haptic feedback on long-press.
 */
import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Session } from '@/sync/storageTypes';
import { sessionKill, sessionDelete } from '@/sync/ops';
import { Modal } from '@/modal';
import { t } from '@/text';
import { showActionSheet, ActionSheetOption } from '@/utils/ActionSheet';
import { hapticsLight } from '@/components/haptics';
import { useSessionStatus } from '@/utils/sessionUtils';
import { HappyError } from '@/utils/errors';
import { useHappyAction } from './useHappyAction';

/**
 * Hook that returns a function to show context menu for a session
 * @param session - The session to show actions for
 * @returns Object with showContextMenu function
 */
export function useSessionContextMenu(session: Session) {
    const router = useRouter();
    const sessionStatus = useSessionStatus(session);

    // Archive action with error handling
    const [_archiving, performArchive] = useHappyAction(async () => {
        const result = await sessionKill(session.id);
        if (!result.success) {
            throw new HappyError(result.message || t('sessionInfo.failedToArchiveSession'), false);
        }
    });

    // Delete action with error handling
    const [_deleting, performDelete] = useHappyAction(async () => {
        const result = await sessionDelete(session.id);
        if (!result.success) {
            throw new HappyError(result.message || t('sessionInfo.failedToDeleteSession'), false);
        }
    });

    const showContextMenu = useCallback(() => {
        // Trigger haptic feedback
        hapticsLight();

        const options: ActionSheetOption[] = [];

        // View session info - always available
        options.push({
            label: t('sessionContextMenu.viewInfo'),
            onPress: () => {
                router.push(`/session/${session.id}/info`);
            },
        });

        // Copy session ID - always available
        options.push({
            label: t('sessionContextMenu.copySessionId'),
            onPress: async () => {
                try {
                    await Clipboard.setStringAsync(session.id);
                    Modal.alert(t('common.success'), t('sessionInfo.happySessionIdCopied'));
                } catch {
                    Modal.alert(t('common.error'), t('sessionInfo.failedToCopySessionId'));
                }
            },
        });

        // Archive session - only for connected sessions
        if (sessionStatus.isConnected) {
            options.push({
                label: t('sessionInfo.archiveSession'),
                destructive: true,
                onPress: () => {
                    Modal.alert(
                        t('sessionInfo.archiveSession'),
                        t('sessionInfo.archiveSessionConfirm'),
                        [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                                text: t('sessionInfo.archiveSession'),
                                style: 'destructive',
                                onPress: performArchive,
                            },
                        ]
                    );
                },
            });
        }

        // Delete session - only for disconnected, inactive sessions
        if (!sessionStatus.isConnected && !session.active) {
            options.push({
                label: t('sessionInfo.deleteSession'),
                destructive: true,
                onPress: () => {
                    Modal.alert(
                        t('sessionInfo.deleteSession'),
                        t('sessionInfo.deleteSessionWarning'),
                        [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                                text: t('sessionInfo.deleteSession'),
                                style: 'destructive',
                                onPress: performDelete,
                            },
                        ]
                    );
                },
            });
        }

        showActionSheet({
            options,
        });
    }, [session, sessionStatus, router, performArchive, performDelete]);

    return { showContextMenu };
}
