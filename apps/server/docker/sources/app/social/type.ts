import { getPublicUrl, ImageRef } from "@/storage/files";
import { RelationshipStatus } from "@prisma/client";
import { GitHubProfile } from "../api/types";

export type UserProfile = {
    id: string;
    firstName: string;
    lastName: string | null;
    avatar: {
        path: string;
        url: string;
        width?: number;
        height?: number;
        thumbhash?: string;
    } | null;
    username: string;
    bio: string | null;
    status: RelationshipStatus;
    /** ISO 8601 date when the friendship was accepted (only present for friends) */
    friendshipDate?: string | null;
    /** Indicates this profile is restricted due to privacy settings (friends-only) */
    isPrivate?: boolean;
}

/**
 * Builds a user profile object for API responses.
 *
 * When isPrivate is true, returns a restricted profile with only basic identifying info
 * (id, firstName, avatar, username, status). Bio and lastName are hidden to protect
 * user privacy when profileVisibility is set to 'friends-only'.
 */
export function buildUserProfile(
    account: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        username: string | null;
        avatar: ImageRef | null;
        githubUser: { profile: GitHubProfile } | null;
    },
    status: RelationshipStatus,
    friendshipDate?: Date | null,
    isPrivate?: boolean
): UserProfile {
    const githubProfile = account.githubUser?.profile;
    const avatarJson = account.avatar;

    let avatar: UserProfile['avatar'] = null;
    if (avatarJson) {
        const avatarData = avatarJson;
        avatar = {
            path: avatarData.path,
            url: getPublicUrl(avatarData.path),
            width: avatarData.width,
            height: avatarData.height,
            thumbhash: avatarData.thumbhash
        };
    }

    // For private profiles, return limited info
    if (isPrivate) {
        return {
            id: account.id,
            firstName: account.firstName || '',
            lastName: null,
            avatar,
            username: account.username || githubProfile?.login || '',
            bio: null,
            status,
            friendshipDate: null,
            isPrivate: true
        };
    }

    return {
        id: account.id,
        firstName: account.firstName || '',
        lastName: account.lastName,
        avatar,
        username: account.username || githubProfile?.login || '',
        bio: githubProfile?.bio || null,
        status,
        friendshipDate: friendshipDate?.toISOString() ?? null
    };
}