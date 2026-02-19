import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { accountUsageLimitsGet } from './accountUsageLimitsGet';

vi.mock('@/storage/db', () => ({
    db: {
        session: {
            count: vi.fn(),
        },
        usageReport: {
            findMany: vi.fn(),
        },
    },
}));

import { db } from '@/storage/db';

const TEST_USER_ID = 'test-user-123';

describe('accountUsageLimitsGet', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        // Wednesday, Feb 19, 2026 12:00:00 UTC
        vi.setSystemTime(new Date('2026-02-19T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return usage limits for a user with no activity', async () => {
        vi.mocked(db.session.count).mockResolvedValue(0);
        vi.mocked(db.usageReport.findMany).mockResolvedValue([]);

        const result = await accountUsageLimitsGet(TEST_USER_ID);

        expect(result.limitsAvailable).toBe(true);
        expect(result.provider).toBe('anthropic');
        expect(result.lastUpdatedAt).toBeGreaterThan(0);
        expect(result.sessionLimit).toBeDefined();
        expect(result.sessionLimit!.id).toBe('active_sessions');
        expect(result.sessionLimit!.percentageUsed).toBe(0);
        expect(result.weeklyLimits).toHaveLength(1);
        expect(result.weeklyLimits[0].id).toBe('weekly_tokens');
        expect(result.weeklyLimits[0].percentageUsed).toBe(0);
    });

    it('should calculate session usage percentage correctly', async () => {
        vi.mocked(db.session.count).mockResolvedValue(3);
        vi.mocked(db.usageReport.findMany).mockResolvedValue([]);

        const result = await accountUsageLimitsGet(TEST_USER_ID);

        // 3/10 = 30%
        expect(result.sessionLimit!.percentageUsed).toBe(30);
        expect(result.sessionLimit!.resetsAt).toBeNull();
        expect(result.sessionLimit!.resetDisplayType).toBe('datetime');
    });

    it('should calculate weekly token usage from reports', async () => {
        vi.mocked(db.session.count).mockResolvedValue(0);
        vi.mocked(db.usageReport.findMany).mockResolvedValue([
            {
                id: 'report-1',
                key: 'k1',
                accountId: TEST_USER_ID,
                sessionId: 'sess-1',
                data: {
                    tokens: { total: 50000, input: 30000, output: 20000 },
                    cost: { total: 0.5, input: 0.3, output: 0.2 },
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'report-2',
                key: 'k2',
                accountId: TEST_USER_ID,
                sessionId: 'sess-2',
                data: {
                    tokens: { total: 100000, input: 60000, output: 40000 },
                    cost: { total: 1.0, input: 0.6, output: 0.4 },
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ] as any);

        const result = await accountUsageLimitsGet(TEST_USER_ID);

        // 150000 / 1000000 = 15%
        expect(result.weeklyLimits[0].percentageUsed).toBe(15);
        expect(result.weeklyLimits[0].resetsAt).toBeGreaterThan(Date.now());
        expect(result.weeklyLimits[0].resetDisplayType).toBe('countdown');
    });

    it('should cap percentage at 100%', async () => {
        vi.mocked(db.session.count).mockResolvedValue(15); // exceeds 10 limit
        vi.mocked(db.usageReport.findMany).mockResolvedValue([]);

        const result = await accountUsageLimitsGet(TEST_USER_ID);

        expect(result.sessionLimit!.percentageUsed).toBe(100);
    });

    it('should include description with counts', async () => {
        vi.mocked(db.session.count).mockResolvedValue(5);
        vi.mocked(db.usageReport.findMany).mockResolvedValue([]);

        const result = await accountUsageLimitsGet(TEST_USER_ID);

        expect(result.sessionLimit!.description).toContain('5');
        expect(result.sessionLimit!.description).toContain('10');
    });

    it('should calculate weekly reset to next Monday UTC', async () => {
        vi.mocked(db.session.count).mockResolvedValue(0);
        vi.mocked(db.usageReport.findMany).mockResolvedValue([]);

        const result = await accountUsageLimitsGet(TEST_USER_ID);

        // Current time is Wednesday Feb 19, 2026. Next Monday is Feb 23, 2026.
        const resetDate = new Date(result.weeklyLimits[0].resetsAt!);
        expect(resetDate.getUTCDay()).toBe(1); // Monday
        expect(resetDate.getUTCHours()).toBe(0);
        expect(resetDate.getUTCMinutes()).toBe(0);
    });

    it('should query usage reports from last 7 days', async () => {
        vi.mocked(db.session.count).mockResolvedValue(0);
        vi.mocked(db.usageReport.findMany).mockResolvedValue([]);

        await accountUsageLimitsGet(TEST_USER_ID);

        expect(vi.mocked(db.usageReport.findMany)).toHaveBeenCalledWith({
            where: {
                accountId: TEST_USER_ID,
                createdAt: {
                    gte: expect.any(Date),
                },
            },
        });

        const callArgs = vi.mocked(db.usageReport.findMany).mock.calls[0][0];
        const gteDate = (callArgs as any).where.createdAt.gte as Date;
        const now = new Date();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        expect(now.getTime() - gteDate.getTime()).toBeCloseTo(sevenDaysMs, -3);
    });

    it('should handle reports with missing tokens.total gracefully', async () => {
        vi.mocked(db.session.count).mockResolvedValue(0);
        vi.mocked(db.usageReport.findMany).mockResolvedValue([
            {
                id: 'report-1',
                key: 'k1',
                accountId: TEST_USER_ID,
                sessionId: null,
                data: {
                    tokens: { input: 100, output: 50 },  // no total field
                    cost: { total: 0.01, input: 0.005, output: 0.005 },
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ] as any);

        const result = await accountUsageLimitsGet(TEST_USER_ID);

        // Should not crash, tokens without total are skipped
        expect(result.weeklyLimits[0].percentageUsed).toBe(0);
    });

    it('should run session and usage queries in parallel', async () => {
        let sessionQueryStarted = false;
        let usageQueryStarted = false;
        let sessionQueryResolved = false;

        vi.mocked(db.session.count).mockImplementation(async () => {
            sessionQueryStarted = true;
            // Check that usage query also started (parallel)
            expect(usageQueryStarted).toBe(true);
            sessionQueryResolved = true;
            return 0;
        });

        vi.mocked(db.usageReport.findMany).mockImplementation(async () => {
            usageQueryStarted = true;
            // Allow session query to run
            return [];
        });

        await accountUsageLimitsGet(TEST_USER_ID);

        expect(sessionQueryStarted).toBe(true);
        expect(sessionQueryResolved).toBe(true);
    });
});
