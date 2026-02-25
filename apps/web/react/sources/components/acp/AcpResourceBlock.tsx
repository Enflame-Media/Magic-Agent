/**
 * HAP-1042: ACP Resource Block Component
 *
 * Renders resource links and embedded resources with name, URI, icon,
 * and tap-to-open behavior. Handles both resource_link and resource
 * content block types.
 */

import * as React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { AcpResourceLink, AcpEmbeddedResource } from '@magic-agent/protocol';
import { t } from '@/text';

interface AcpResourceLinkBlockProps {
    content: AcpResourceLink;
}

interface AcpEmbeddedResourceBlockProps {
    content: AcpEmbeddedResource;
}

function getMimeIcon(mimeType: string | null | undefined): keyof typeof Ionicons.glyphMap {
    if (!mimeType) return 'document-outline';
    if (mimeType.startsWith('image/')) return 'image-outline';
    if (mimeType.startsWith('text/')) return 'document-text-outline';
    if (mimeType.startsWith('application/json')) return 'code-slash-outline';
    if (mimeType.startsWith('application/')) return 'document-attach-outline';
    return 'document-outline';
}

function formatSize(size: number | null | undefined): string | null {
    if (size == null) return null;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export const AcpResourceLinkBlock = React.memo<AcpResourceLinkBlockProps>(({ content }) => {
    const handlePress = React.useCallback(() => {
        Linking.openURL(content.uri).catch(() => {
            // Silently fail if URI cannot be opened
        });
    }, [content.uri]);

    const sizeText = formatSize(content.size);
    const displayName = content.title ?? content.name;

    return (
        <Pressable onPress={handlePress} style={styles.container} accessibilityRole="link">
            <View style={styles.iconContainer}>
                <Ionicons
                    name={getMimeIcon(content.mimeType)}
                    size={18}
                    style={styles.icon}
                />
            </View>
            <View style={styles.content}>
                <Text style={styles.name} numberOfLines={1}>
                    {displayName}
                </Text>
                <Text style={styles.uri} numberOfLines={1}>
                    {content.uri}
                </Text>
                {(content.description || sizeText) && (
                    <Text style={styles.meta} numberOfLines={1}>
                        {content.description ?? ''}
                        {content.description && sizeText ? ' \u00B7 ' : ''}
                        {sizeText ?? ''}
                    </Text>
                )}
            </View>
            <Ionicons name="open-outline" size={14} style={styles.openIcon} />
        </Pressable>
    );
});

export const AcpEmbeddedResourceBlock = React.memo<AcpEmbeddedResourceBlockProps>(({ content }) => {
    const resource = content.resource;
    const isText = 'text' in resource;
    const displayName = resource.uri.split('/').pop() ?? resource.uri;

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Ionicons
                    name={isText ? 'document-text-outline' : 'document-attach-outline'}
                    size={18}
                    style={styles.icon}
                />
            </View>
            <View style={styles.content}>
                <Text style={styles.name} numberOfLines={1}>
                    {displayName}
                </Text>
                <Text style={styles.uri} numberOfLines={1}>
                    {resource.uri}
                </Text>
                {resource.mimeType && (
                    <Text style={styles.meta} numberOfLines={1}>
                        {resource.mimeType}
                    </Text>
                )}
                {isText && (
                    <Text style={styles.embeddedText} numberOfLines={6}>
                        {resource.text}
                    </Text>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 10,
        padding: 10,
        marginVertical: 2,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    icon: {
        color: theme.colors.primary,
    },
    content: {
        flex: 1,
    },
    name: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.typography,
    },
    uri: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
        fontFamily: 'monospace',
    },
    meta: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    openIcon: {
        color: theme.colors.textSecondary,
        marginLeft: 8,
        marginTop: 4,
    },
    embeddedText: {
        fontSize: 12,
        color: theme.colors.typography,
        fontFamily: 'monospace',
        marginTop: 6,
        lineHeight: 16,
        backgroundColor: theme.colors.background,
        borderRadius: 6,
        padding: 8,
        overflow: 'hidden',
    },
}));
