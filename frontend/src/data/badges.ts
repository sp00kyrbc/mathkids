import type { Badge } from '../store/useAppStore';

export const ALL_BADGES: Omit<Badge, 'unlockedAt'>[] = [
  // Pierwsze kroki
  { id: 'first_task', name: 'Pierwszy krok', emoji: '👣', description: 'Ukończ swoje pierwsze zadanie' },
  { id: 'first_correct', name: 'Celna odpowiedź', emoji: '🎯', description: 'Odpowiedz poprawnie na pierwsze zadanie' },
  { id: 'first_test', name: 'Odważny testujący', emoji: '📝', description: 'Ukończ swój pierwszy test' },

  // Serie
  { id: 'streak_3', name: 'Trzy z rzędu', emoji: '🔥', description: '3 poprawne odpowiedzi pod rząd' },
  { id: 'streak_5', name: 'Gorąca passa', emoji: '🔥🔥', description: '5 poprawnych pod rząd' },
  { id: 'streak_10', name: 'Niepokonany!', emoji: '⚡', description: '10 poprawnych pod rząd' },

  // Dodawanie
  { id: 'add_10', name: 'Sumator', emoji: '➕', description: 'Rozwiąż 10 zadań z dodawania' },
  { id: 'add_50', name: 'Mistrz dodawania', emoji: '🏅', description: 'Rozwiąż 50 zadań z dodawania' },

  // Odejmowanie
  { id: 'sub_10', name: 'Odejminator', emoji: '➖', description: 'Rozwiąż 10 zadań z odejmowania' },
  { id: 'sub_50', name: 'Mistrz odejmowania', emoji: '🏅', description: 'Rozwiąż 50 zadań z odejmowania' },

  // Mnożenie
  { id: 'mul_10', name: 'Mnożyciel', emoji: '✖️', description: 'Rozwiąż 10 zadań z mnożenia' },
  { id: 'mul_50', name: 'Mistrz mnożenia', emoji: '🏅', description: 'Rozwiąż 50 zadań z mnożenia' },

  // Dzielenie
  { id: 'div_10', name: 'Dzieliciel', emoji: '➗', description: 'Rozwiąż 10 zadań z dzielenia' },
  { id: 'div_50', name: 'Mistrz dzielenia', emoji: '🏅', description: 'Rozwiąż 50 zadań z dzielenia' },

  // Oceny
  { id: 'grade_5', name: 'Prymus', emoji: '⭐', description: 'Dostań ocenę 5 w teście' },
  { id: 'grade_6', name: 'Geniusz!', emoji: '🏆', description: 'Dostań ocenę 6 w teście — bezbłędnie!' },

  // Poziomy
  { id: 'level_3', name: 'Wschodzący matematyk', emoji: '📈', description: 'Osiągnij poziom 3' },
  { id: 'level_5', name: 'Zaawansowany', emoji: '🚀', description: 'Osiągnij poziom 5' },
  { id: 'level_10', name: 'Ekspert!', emoji: '💎', description: 'Osiągnij poziom 10' },

  // Dni z rzędu
  { id: 'daily_3', name: '3 dni z rzędu', emoji: '📅', description: 'Ćwicz 3 dni pod rząd' },
  { id: 'daily_7', name: 'Tygodniowy wojownik', emoji: '🗓️', description: 'Ćwicz 7 dni pod rząd' },
  { id: 'daily_30', name: 'Miesiąc nauki!', emoji: '🎖️', description: 'Ćwicz 30 dni pod rząd' },

  // Specjalne
  { id: 'all_ops', name: 'Czteropak', emoji: '🎲', description: 'Rozwiąż zadanie z każdej operacji' },
  { id: 'xp_500', name: 'Zbieracz punktów', emoji: '💰', description: 'Zdobądź 500 punktów doświadczenia' },
  { id: 'xp_2000', name: 'Bogaty w wiedzę', emoji: '💎', description: 'Zdobądź 2000 punktów doświadczenia' },
];

// Inicjalizuj odznaki dla nowego profilu (wszystkie zablokowane)
export function initBadges(): Badge[] {
  return ALL_BADGES.map(b => ({ ...b, unlockedAt: null }));
}
