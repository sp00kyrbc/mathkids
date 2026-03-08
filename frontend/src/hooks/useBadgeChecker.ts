import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ChildProfile } from '../store/useAppStore';

export function useBadgeChecker() {
  const unlockBadge = useAppStore(s => s.unlockBadge);

  const checkBadges = useCallback((profile: ChildProfile, context: {
    streak?: number;
    newLevel?: number;
    testGrade?: number;
    operation?: string;
    xp?: number;
  }) => {
    const unlocked: string[] = [];
    const profileStreak = profile.streak;
    const stats = profile.stats;

    // Pierwsze zadanie
    const totalTasks = Object.values(stats).reduce((s, v) => s + v.total, 0);
    if (totalTasks >= 1) unlocked.push('first_task');
    const totalCorrect = Object.values(stats).reduce((s, v) => s + v.correct, 0);
    if (totalCorrect >= 1) unlocked.push('first_correct');

    // Serie
    const streak = context.streak ?? 0;
    if (streak >= 3) unlocked.push('streak_3');
    if (streak >= 5) unlocked.push('streak_5');
    if (streak >= 10) unlocked.push('streak_10');

    // Statystyki operacji
    if (stats.addition.total >= 10) unlocked.push('add_10');
    if (stats.addition.total >= 50) unlocked.push('add_50');
    if (stats.subtraction.total >= 10) unlocked.push('sub_10');
    if (stats.subtraction.total >= 50) unlocked.push('sub_50');
    if (stats.multiplication.total >= 10) unlocked.push('mul_10');
    if (stats.multiplication.total >= 50) unlocked.push('mul_50');
    if (stats.division.total >= 10) unlocked.push('div_10');
    if (stats.division.total >= 50) unlocked.push('div_50');

    // Wszystkie operacje użyte
    const allUsed = Object.values(stats).every(v => v.total > 0);
    if (allUsed) unlocked.push('all_ops');

    // Poziomy
    const level = profile.level;
    if (level >= 3) unlocked.push('level_3');
    if (level >= 5) unlocked.push('level_5');
    if (level >= 10) unlocked.push('level_10');

    // Oceny testu
    if (context.testGrade && context.testGrade >= 5) unlocked.push('grade_5');
    if (context.testGrade && context.testGrade >= 6) unlocked.push('grade_6');

    // XP
    const xp = context.xp ?? profile.xp;
    if (xp >= 500) unlocked.push('xp_500');
    if (xp >= 2000) unlocked.push('xp_2000');

    // Streak dzienny
    if (profileStreak >= 3) unlocked.push('daily_3');
    if (profileStreak >= 7) unlocked.push('daily_7');
    if (profileStreak >= 30) unlocked.push('daily_30');

    // Odblokuj niezdobyte
    const newBadges: string[] = [];
    unlocked.forEach(badgeId => {
      const existing = profile.badges.find(b => b.id === badgeId);
      if (!existing || !existing.unlockedAt) {
        unlockBadge(profile.id, badgeId);
        newBadges.push(badgeId);
      }
    });

    return newBadges;  // zwróć nowo odblokowane (do animacji)
  }, [unlockBadge]);

  return { checkBadges };
}
