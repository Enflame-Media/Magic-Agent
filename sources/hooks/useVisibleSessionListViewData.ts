import * as React from 'react';
import { SessionListViewItem, useSessionListViewData, useSetting } from '@/sync/storage';

export function useVisibleSessionListViewData(): SessionListViewItem[] | null {
    const data = useSessionListViewData();
    const hideInactiveSessions = useSetting('hideInactiveSessions');

    return React.useMemo(() => {
        if (!data) {
            return data;
        }
        if (!hideInactiveSessions) {
            return data;
        }

        const filtered: SessionListViewItem[] = [];
        let pendingHeader: SessionListViewItem | null = null;

        for (const item of data) {
            if (item.type === 'header') {
                // Keep header pending until we find an active session that follows it
                pendingHeader = item;
                continue;
            }

            if (item.type === 'project-group') {
                // Project groups now contain sessions directly
                // Filter to only include active sessions within the group
                const activeSessions = item.sessions.filter(s => s.active);
                if (activeSessions.length > 0) {
                    // Push pending header if there is one
                    if (pendingHeader) {
                        filtered.push(pendingHeader);
                        pendingHeader = null;
                    }
                    // Push project group with only active sessions
                    filtered.push({
                        ...item,
                        sessions: activeSessions
                    });
                }
                continue;
            }

            if (item.type === 'session') {
                if (item.session.active) {
                    if (pendingHeader) {
                        filtered.push(pendingHeader);
                        pendingHeader = null;
                    }
                    filtered.push(item);
                }
                continue;
            }

            pendingHeader = null;

            if (item.type === 'active-sessions') {
                filtered.push(item);
            }
        }

        return filtered;
    }, [data, hideInactiveSessions]);
}
