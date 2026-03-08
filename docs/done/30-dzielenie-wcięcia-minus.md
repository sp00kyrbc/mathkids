# 30-dzielenie-wcięcia-minus.md — Dzielenie: popraw wcięcia i pozycję minusa

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Problem

Dla `817 ÷ 1 = 817` układ wygląda tak (błędnie):
```
−  8                 ← OK, minus przy lewej krawędzi
   1                 ← reszta+cyfra OK
−     1              ← BŁĄD: minus daleko od iloczynu
         7           ← reszta+cyfra
−           ?        ← BŁĄD: minus jeszcze dalej
```

Powinno być:
```
−  8                 ← substep 0: indent=0, minus tuż przed "8"
   1                 ← reszta: current_value=1
   −  1              ← substep 1: indent=1, minus tuż przed "1"
      7              ← reszta: current_value=7
      −  7           ← substep 2: indent=2, minus tuż przed "7"
         0           ← reszta końcowa
```

## Przyczyna

Znak `−` jest zawsze renderowany jako pierwsza komórka wiersza (pozycja 0),
a wcięcie jest dodawane między nim a cyfrem iloczynu.
Efekt: minus zostaje z lewej, cyfry przesuwają się w prawo.

**Powinno być:** minus stoi BEZPOŚREDNIO przed pierwszą cyfrą iloczynu.

---

## Napraw `DivisionDisplay.tsx` — wiersz iloczynu

Znajdź sekcję `{/* Iloczyn z minusem */}` i zastąp:

```typescript
{/* Iloczyn z minusem */}
<div className="flex items-center">
  {/* Wcięcie BEZ minusa */}
  {Array(indent).fill(null).map((_, k) =>
    <div key={k} className={emptyCls} />
  )}
  {/* Minus TUŻ PRZED cyframi */}
  <div className={`${emptyCls} text-2xl sm:text-3xl font-bold ${textCls}`}>−</div>
  {/* Cyfry iloczynu */}
  {productStr.split('').map((d, pi) => {
    const pcell = getProductCell(si, pi);
    if (pcell) return renderInput(pcell);
    return <div key={pi} className={givenCls}>{d}</div>;
  })}
</div>
```

## Napraw — kreska odejmowania

Kreska musi być pod minusem + cyframi iloczynu:

```typescript
{/* Kreska odejmowania */}
<div className="flex">
  {/* Wcięcie */}
  {Array(indent).fill(null).map((_, k) =>
    <div key={k} style={{ width: cellPx }} />
  )}
  {/* Kreska obejmuje: 1 komórkę minusa + cyfry iloczynu */}
  <div
    className={`border-t-2 ${lineCol} my-0.5`}
    style={{ width: `${(1 + sub.product_len) * cellPx}px` }}
  />
</div>
```

## Napraw — wiersz małych kratek przeniesień (borrow)

Te kratki też muszą być wyrównane do iloczynu (z wcięciem, bez przesunięcia na lewo):

```typescript
{hasBorrow && (
  <div className="flex">
    {/* Wcięcie */}
    {Array(indent).fill(null).map((_, k) =>
      <div key={k} className={emptyBCls} />
    )}
    {/* Placeholder na minus */}
    <div className={emptyBCls} />
    {/* Kratki przeniesień */}
    {productStr.split('').map((_, pi) => {
      const hasBorrowHere = borrow[pi] === 1;
      const borrowKey = `${si}-${pi}`;
      const isUnlocked = unlockedBorrows.has(borrowKey);

      if (!hasBorrowHere) return <div key={pi} className={emptyBCls} />;

      if (!isUnlocked) {
        return (
          <div
            key={pi}
            className={`${CSb} cursor-pointer opacity-0 hover:opacity-40 transition-opacity rounded`}
            title="Kliknij aby zapisac przeniesienie"
            onClick={e => {
              e.stopPropagation();
              setUnlockedBorrows(prev => new Set(prev).add(borrowKey));
            }}
          />
        );
      }

      return (
        <div key={pi} className={`${CSb} flex items-end justify-center pb-0.5 text-xs font-bold
          ${theme === 'chalk' ? 'text-chalk-accent' : 'text-red-500'}`}>
          1
        </div>
      );
    })}
  </div>
)}
```

## Napraw — reszta i dociągnięta cyfra (current_value następnego kroku)

Reszta musi być wyrównana do tej samej kolumny co iloczyn poprzedniego kroku:

```typescript
<AnimatePresence>
  {isRemainderRevealed && (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex"
    >
      {si < substeps.length - 1 ? (
        <>
          {/* Wcięcie dla następnego substep */}
          {Array(substeps[si + 1].quotient_col - substeps[si + 1].current_len + 1)
            .fill(null).map((_, k) =>
              <div key={k} className={emptyCls} />
          )}
          {/* Minus placeholder żeby wyrównać z iloczynem */}
          <div className={emptyCls} />
          {/* Cyfry next current_value */}
          {String(substeps[si + 1].current_value).split('').map((d, k) => (
            <div key={k} className={givenCls}>{d}</div>
          ))}
        </>
      ) : (
        <>
          {/* Reszta końcowa — wyrównana do ostatniej kolumny */}
          {Array(substeps[si].quotient_col).fill(null).map((_, k) =>
            <div key={k} className={emptyCls} />
          )}
          <div className={emptyCls} /> {/* placeholder minus */}
          <div className={givenCls}>{sub.remainder}</div>
        </>
      )}
    </motion.div>
  )}
</AnimatePresence>
```

---

## Zdefiniuj `cellPx` jako stałą

Na górze komponentu (po stylach) dodaj:
```typescript
// Musi zgadzać się z CELL_W: w-12=48px, sm:w-14=56px, lg:w-16=64px
// Używamy 56px jako wartości bazowej (sm) dla obliczeń szerokości linii
const cellPx = 56;
```

---

## Checklist

### `817 ÷ 1 = 817`
```
   [8][1][7]
   ──────────
   8  1  7  :  1
   −  8         ← minus tuż przed "8"
   ──
   1            ← pojawia się po wpisaniu
   −  1         ← minus tuż przed "1" (wcięcie 1)
      ──
      7         ← pojawia się po wpisaniu
      −  7      ← minus tuż przed "7" (wcięcie 2)
         ──
         0      ← reszta końcowa
```
- [ ] Każdy `−` stoi bezpośrednio przed swoim iloczynem
- [ ] Kreska jest pod `− cyfra` razem (nie sama cyfra)
- [ ] Reszta+dociągnięta cyfra wyrównana do lewej krawędzi iloczynu następnego kroku

### `689 ÷ 53 = 13`
```
      [1][3]
   ────────────
   6  8  9  :  5  3
      −  5  3    ← wcięcie 0, minus przed "53"
      ─────
      1  5  9    ← pojawia się
      −  1  5  9 ← wcięcie 0, minus przed "159"
      ─────
            0
```
- [ ] Oba iloczynu wyrównane do prawej pod odpowiadającym current_value
