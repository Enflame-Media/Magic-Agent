/**
 * Share Session Screen
 *
 * Allows users to share sessions with friends or via URL.
 * Part of HAP-770: Implement Share Session UI for happy-app React Native mobile.
 */
import * as React from 'react';
import { View, Text, TextInput, ActivityIndicator, Platform, Pressable, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import { t } from '@/text';
import { Item } from '@/components/Item';
import { ItemGroup } from '@/components/ItemGroup';
import { ItemList } from '@/components/ItemList';
import { Switch } from '@/components/Switch';
import { Avatar } from '@/components/Avatar';
import { UserCard } from '@/components/UserCard';
import { useSessionSharing } from '@/hooks/useSessionSharing';
import { useSession } from '@/sync/storage';
import { useHappyAction } from '@/hooks/useHappyAction';
import { hapticsLight } from '@/components/haptics';
import { Toast } from '@/toast';
import { Modal } from '@/modal';
import { layout } from '@/components/layout';
import { getDisplayName, type UserProfile } from '@/sync/friendTypes';
import type { SessionSharePermission, SessionShareEntry } from '@magic-agent/protocol';

// Permission selector component
interface PermissionSelectorProps {
    value: SessionSharePermission;
    onChange: (permission: SessionSharePermission) => void;
    disabled?: boolean;
}

const PermissionSelector = React.memo(({ value, onChange, disabled }: PermissionSelectorProps) => {
    const { theme } = useUnistyles();

    return (
        <View style={styles.permissionSelector}>
            <Pressable
                onPress={() => !disabled && onChange('view_only')}
                disabled={disabled}
                style={[
                    styles.permissionButton,
                    value === 'view_only' && { backgroundColor: theme.colors.button.primary.background },
                    disabled && { opacity: 0.5 },
                ]}
            >
                <Text style={[
                    styles.permissionButtonText,
                    { color: value === 'view_only' ? theme.colors.button.primary.tint : theme.colors.text }
                ]}>
                    {t('sharing.viewOnly')}
                </Text>
            </Pressable>
            <Pressable
                onPress={() => !disabled && onChange('view_and_chat')}
                disabled={disabled}
                style={[
                    styles.permissionButton,
                    value === 'view_and_chat' && { backgroundColor: theme.colors.button.primary.background },
                    disabled && { opacity: 0.5 },
                ]}
            >
                <Text style={[
                    styles.permissionButtonText,
                    { color: value === 'view_and_chat' ? theme.colors.button.primary.tint : theme.colors.text }
                ]}>
                    {t('sharing.viewAndChat')}
                </Text>
            </Pressable>
        </View>
    );
});

// Share entry item component
interface ShareEntryItemProps {
    entry: SessionShareEntry;
    onRemove: () => void;
    isRemoving: boolean;
}

const ShareEntryItem = React.memo(({ entry, onRemove, isRemoving }: ShareEntryItemProps) => {
    const { theme } = useUnistyles();

    const displayName = entry.userProfile
        ? getDisplayName(entry.userProfile)
        : entry.userId.substring(0, 8) + '...';
    const subtitle = entry.userProfile?.username
        ? `@${entry.userProfile.username}`
        : t('sharing.permissionLevel', { level: entry.permission === 'view_only' ? t('sharing.viewOnly') : t('sharing.viewAndChat') });

    const handleRemove = React.useCallback(() => {
        Modal.alert(
            t('sharing.removeAccess'),
            t('sharing.removeAccessConfirm', { name: displayName }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('sharing.remove'), style: 'destructive', onPress: onRemove }
            ]
        );
    }, [displayName, onRemove]);

    const avatarElement = entry.userProfile ? (
        <Avatar
            id={entry.userId}
            size={40}
            imageUrl={entry.userProfile.avatar?.url || entry.userProfile.avatar?.path}
            thumbhash={entry.userProfile.avatar?.thumbhash}
        />
    ) : (
        <View style={[styles.placeholderAvatar, { backgroundColor: theme.colors.divider }]}>
            <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
        </View>
    );

    const removeButton = (
        <Pressable
            onPress={handleRemove}
            disabled={isRemoving}
            style={({ pressed }) => [
                styles.removeButton,
                { borderColor: theme.colors.divider },
                pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
        >
            {isRemoving ? (
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            ) : (
                <Ionicons name="close" size={18} color={theme.colors.textDestructive} />
            )}
        </Pressable>
    );

    return (
        <Item
            title={displayName}
            subtitle={subtitle}
            leftElement={avatarElement}
            rightElement={removeButton}
            showChevron={false}
        />
    );
});

// Friend picker for adding shares
interface FriendPickerProps {
    friends: UserProfile[];
    onSelect: (friend: UserProfile) => void;
}

const FriendPicker = React.memo(({ friends, onSelect }: FriendPickerProps) => {
    const { theme } = useUnistyles();
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredFriends = React.useMemo(() => {
        if (!searchQuery.trim()) return friends;
        const query = searchQuery.toLowerCase();
        return friends.filter(f => {
            const displayName = getDisplayName(f).toLowerCase();
            const username = f.username.toLowerCase();
            return displayName.includes(query) || username.includes(query);
        });
    }, [friends, searchQuery]);

    if (friends.length === 0) {
        return (
            <View style={styles.emptyFriends}>
                <Ionicons name="people-outline" size={32} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyFriendsText, { color: theme.colors.textSecondary }]}>
                    {t('sharing.noFriendsAvailable')}
                </Text>
            </View>
        );
    }

    return (
        <View>
            {friends.length > 5 && (
                <View style={[styles.searchContainer, { borderBottomColor: theme.colors.divider }]}>
                    <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder={t('sharing.searchFriends')}
                        placeholderTextColor={theme.colors.textSecondary}
                        style={[styles.searchInput, { color: theme.colors.text }]}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>
            )}
            {filteredFriends.map(friend => (
                <UserCard
                    key={friend.id}
                    user={friend}
                    onPress={() => onSelect(friend)}
                />
            ))}
            {filteredFriends.length === 0 && searchQuery && (
                <View style={styles.noResults}>
                    <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                        {t('sharing.noMatchingFriends')}
                    </Text>
                </View>
            )}
        </View>
    );
});

// Main screen component
function ShareSessionContent({ sessionId }: { sessionId: string }) {
    const { theme } = useUnistyles();
    const router = useRouter();
    const session = useSession(sessionId);
    const {
        shareSettings,
        isLoading,
        error,
        addShare,
        removeShare,
        updateUrlSharing,
        getShareUrl,
        availableFriends,
    } = useSessionSharing(sessionId);

    const [urlSharingEnabled, setUrlSharingEnabled] = React.useState(false);
    const [urlPermission, setUrlPermission] = React.useState<SessionSharePermission>('view_only');
    const [urlPassword, setUrlPassword] = React.useState('');
    const [showAddFriend, setShowAddFriend] = React.useState(false);
    const [addPermission, setAddPermission] = React.useState<SessionSharePermission>('view_only');
    const [removingShareId, setRemovingShareId] = React.useState<string | null>(null);

    // Sync URL sharing state from settings
    React.useEffect(() => {
        if (shareSettings) {
            setUrlSharingEnabled(shareSettings.urlSharing.enabled);
            setUrlPermission(shareSettings.urlSharing.permission);
            setUrlPassword(shareSettings.urlSharing.password || '');
        }
    }, [shareSettings]);

    // Add share action
    const [addingShare, doAddShare] = useHappyAction(async () => {
        // Will be called via handleAddFriend
    });

    const handleAddFriend = React.useCallback(async (friend: UserProfile) => {
        hapticsLight();
        try {
            await addShare(friend.id, addPermission);
            Toast.show({ message: t('sharing.shareAdded', { name: getDisplayName(friend) }) });
            setShowAddFriend(false);
        } catch (e) {
            // Error handled by addShare
        }
    }, [addShare, addPermission]);

    // Remove share action
    const [removingShare, doRemoveShare] = useHappyAction(async () => {
        if (!removingShareId) return;
        await removeShare(removingShareId);
        Toast.show({ message: t('sharing.shareRemoved') });
        setRemovingShareId(null);
    });

    const handleRemoveShare = React.useCallback((shareId: string) => {
        setRemovingShareId(shareId);
        doRemoveShare();
    }, [doRemoveShare]);

    // URL sharing toggle
    const [updatingUrlSharing, doUpdateUrlSharing] = useHappyAction(async () => {
        await updateUrlSharing({
            enabled: !urlSharingEnabled,
            password: urlPassword || null,
            permission: urlPermission,
        });
        hapticsLight();
    });

    const handleToggleUrlSharing = React.useCallback(() => {
        setUrlSharingEnabled(prev => !prev);
        doUpdateUrlSharing();
    }, [doUpdateUrlSharing]);

    // Copy URL action
    const handleCopyUrl = React.useCallback(async () => {
        const url = getShareUrl();
        if (url) {
            await Clipboard.setStringAsync(url);
            hapticsLight();
            Toast.show({ message: t('sharing.urlCopied') });
        }
    }, [getShareUrl]);

    // Share URL action (native share sheet)
    const handleShareUrl = React.useCallback(async () => {
        const url = getShareUrl();
        if (url) {
            hapticsLight();
            try {
                await Share.share({
                    url,
                    message: t('sharing.shareMessage'),
                    title: t('sharing.shareTitle'),
                });
            } catch (e) {
                // User cancelled or error
            }
        }
    }, [getShareUrl]);

    // Loading state
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.textSecondary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                    {t('common.loading')}
                </Text>
            </View>
        );
    }

    // Error state
    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textDestructive} />
                <Text style={[styles.errorText, { color: theme.colors.text }]}>
                    {error}
                </Text>
            </View>
        );
    }

    const shareUrl = getShareUrl();
    const hasShares = shareSettings && shareSettings.shares.length > 0;

    return (
        <ItemList>
            <View style={{ maxWidth: layout.maxWidth, alignSelf: 'center', width: '100%' }}>
                {/* URL Sharing Section */}
                <ItemGroup title={t('sharing.urlSharing')}>
                    <Item
                        title={t('sharing.enableUrlSharing')}
                        subtitle={t('sharing.enableUrlSharingDescription')}
                        showChevron={false}
                        rightElement={
                            <Switch
                                value={urlSharingEnabled}
                                onValueChange={handleToggleUrlSharing}
                                disabled={updatingUrlSharing}
                            />
                        }
                    />
                    {urlSharingEnabled && (
                        <>
                            <Item
                                title={t('sharing.permission')}
                                showChevron={false}
                                rightElement={
                                    <PermissionSelector
                                        value={urlPermission}
                                        onChange={(perm) => {
                                            setUrlPermission(perm);
                                            updateUrlSharing({ enabled: true, permission: perm });
                                        }}
                                    />
                                }
                            />
                            <View style={[styles.passwordContainer, { borderTopColor: theme.colors.divider }]}>
                                <Text style={[styles.passwordLabel, { color: theme.colors.textSecondary }]}>
                                    {t('sharing.password')}
                                </Text>
                                <TextInput
                                    value={urlPassword}
                                    onChangeText={setUrlPassword}
                                    onBlur={() => {
                                        if (urlSharingEnabled) {
                                            updateUrlSharing({ enabled: true, password: urlPassword || null });
                                        }
                                    }}
                                    placeholder={t('sharing.optionalPassword')}
                                    placeholderTextColor={theme.colors.textSecondary}
                                    style={[styles.passwordInput, { color: theme.colors.text }]}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                            {shareUrl && (
                                <View style={[styles.urlContainer, { borderTopColor: theme.colors.divider }]}>
                                    <Text
                                        style={[styles.urlText, { color: theme.colors.textLink }]}
                                        numberOfLines={1}
                                        ellipsizeMode="middle"
                                    >
                                        {shareUrl}
                                    </Text>
                                    <View style={styles.urlButtons}>
                                        <Pressable
                                            onPress={handleCopyUrl}
                                            style={({ pressed }) => [
                                                styles.urlButton,
                                                { backgroundColor: theme.colors.surface },
                                                pressed && { opacity: 0.7 },
                                            ]}
                                        >
                                            <Ionicons name="copy-outline" size={20} color={theme.colors.button.primary.tint} />
                                        </Pressable>
                                        <Pressable
                                            onPress={handleShareUrl}
                                            style={({ pressed }) => [
                                                styles.urlButton,
                                                { backgroundColor: theme.colors.button.primary.background },
                                                pressed && { opacity: 0.7 },
                                            ]}
                                        >
                                            <Ionicons name="share-outline" size={20} color={theme.colors.button.primary.tint} />
                                        </Pressable>
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </ItemGroup>

                {/* People with Access Section */}
                <ItemGroup title={t('sharing.peopleWithAccess')}>
                    {hasShares ? (
                        shareSettings.shares.map(entry => (
                            <ShareEntryItem
                                key={entry.id}
                                entry={entry}
                                onRemove={() => handleRemoveShare(entry.id)}
                                isRemoving={removingShareId === entry.id && removingShare}
                            />
                        ))
                    ) : (
                        <View style={styles.noSharesContainer}>
                            <Text style={[styles.noSharesText, { color: theme.colors.textSecondary }]}>
                                {t('sharing.noShares')}
                            </Text>
                        </View>
                    )}
                    <Item
                        title={t('sharing.addPeople')}
                        subtitle={t('sharing.addPeopleDescription')}
                        icon={<Ionicons name="person-add-outline" size={24} color={theme.colors.button.primary.tint} />}
                        onPress={() => setShowAddFriend(!showAddFriend)}
                    />
                </ItemGroup>

                {/* Add Friend Picker (expandable) */}
                {showAddFriend && (
                    <ItemGroup title={t('sharing.selectFriend')}>
                        <View style={[styles.addPermissionContainer, { borderBottomColor: theme.colors.divider }]}>
                            <Text style={[styles.addPermissionLabel, { color: theme.colors.text }]}>
                                {t('sharing.grantPermission')}
                            </Text>
                            <PermissionSelector
                                value={addPermission}
                                onChange={setAddPermission}
                            />
                        </View>
                        <FriendPicker
                            friends={availableFriends}
                            onSelect={handleAddFriend}
                        />
                    </ItemGroup>
                )}
            </View>
        </ItemList>
    );
}

// Screen wrapper with session loading
export default React.memo(function ShareSessionScreen() {
    const { theme } = useUnistyles();
    const { id } = useLocalSearchParams<{ id: string }>();

    if (!id) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textDestructive} />
                <Text style={[styles.errorText, { color: theme.colors.text }]}>
                    {t('errors.sessionNotFound')}
                </Text>
            </View>
        );
    }

    return <ShareSessionContent sessionId={id} />;
});

const styles = StyleSheet.create((theme) => ({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
    },
    loadingText: {
        ...Typography.default(),
        fontSize: 16,
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
        paddingHorizontal: 32,
    },
    errorText: {
        ...Typography.default('semiBold'),
        fontSize: 17,
        marginTop: 16,
        textAlign: 'center',
    },
    permissionSelector: {
        flexDirection: 'row',
        borderRadius: 8,
        overflow: 'hidden',
    },
    permissionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginLeft: 4,
    },
    permissionButtonText: {
        ...Typography.default('semiBold'),
        fontSize: 13,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: Platform.select({ ios: 0.33, default: 0 }),
    },
    passwordLabel: {
        ...Typography.default(),
        fontSize: 15,
        marginRight: 12,
    },
    passwordInput: {
        ...Typography.default(),
        flex: 1,
        fontSize: 15,
        padding: 8,
        borderRadius: 8,
        backgroundColor: theme.colors.divider,
    },
    urlContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: Platform.select({ ios: 0.33, default: 0 }),
    },
    urlText: {
        ...Typography.default(),
        flex: 1,
        fontSize: 14,
        marginRight: 12,
    },
    urlButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    urlButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    noSharesContainer: {
        paddingVertical: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    noSharesText: {
        ...Typography.default(),
        fontSize: 15,
    },
    addPermissionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: Platform.select({ ios: 0.33, default: 0 }),
    },
    addPermissionLabel: {
        ...Typography.default('semiBold'),
        fontSize: 15,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: Platform.select({ ios: 0.33, default: 0 }),
        gap: 8,
    },
    searchInput: {
        ...Typography.default(),
        flex: 1,
        fontSize: 15,
        padding: 0,
    },
    emptyFriends: {
        alignItems: 'center',
        paddingVertical: 32,
        gap: 12,
    },
    emptyFriendsText: {
        ...Typography.default(),
        fontSize: 15,
        textAlign: 'center',
    },
    noResults: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    noResultsText: {
        ...Typography.default(),
        fontSize: 15,
    },
}));
