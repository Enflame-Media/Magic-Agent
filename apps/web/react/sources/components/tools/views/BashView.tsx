import * as React from 'react';
import { ToolCall } from '@/sync/typesMessage';
import { ToolSectionView } from '../../tools/ToolSectionView';
import { CommandView } from '@/components/CommandView';
import { Metadata } from '@/sync/storageTypes';

export const BashView = React.memo((props: { tool: ToolCall, metadata?: Metadata | null }) => {
    const { input, result, state } = props.tool;

    let error: string | null = null;

    if (state === 'error' && typeof result === 'string') {
        error = result;
    }

    return (
        <>
            <ToolSectionView>
                <CommandView 
                    command={input.command}
                    // Don't show output in compact view
                    stdout={null}
                    stderr={null}
                    error={error}
                    hideEmptyOutput
                />
            </ToolSectionView>
        </>
    );
});