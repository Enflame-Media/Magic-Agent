import { Context } from "@/context";
import { buildUserProfile, UserProfile } from "./type";
import { db } from "@/storage/db";
import { RelationshipStatus } from "@prisma/client";

export async function friendList(ctx: Context): Promise<UserProfile[]> {
    // Query all relationships where current user is fromUserId with friend, pending, or requested status
    const relationships = await db.userRelationship.findMany({
        where: {
            fromUserId: ctx.uid,
            status: {
                in: [RelationshipStatus.friend, RelationshipStatus.pending, RelationshipStatus.requested]
            }
        },
        include: {
            toUser: {
                include: {
                    githubUser: true
                }
            }
        }
    });

    // Build UserProfile objects with friendship date (updatedAt is when status changed to 'friend')
    const profiles: UserProfile[] = [];
    for (const relationship of relationships) {
        // Only include friendshipDate for actual friends (status = friend means accepted)
        const friendshipDate = relationship.status === RelationshipStatus.friend
            ? relationship.updatedAt
            : null;
        profiles.push(buildUserProfile(relationship.toUser, relationship.status, friendshipDate));
    }

    return profiles;
}