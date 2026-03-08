# 31-dzielenie-minus-poza-siatka.md — Minus poza kolumnami dzielnej

## Przeczytaj CLAUDE.md przed rozpoczęciem.

## Problem

Dla `879 ÷ 3`: first step `current=8`, `product=6`.
`6` stoi pod `7` zamiast pod `8`.

## Przyczyna

Znak `−` zajmuje jedną komórkę **wewnątrz** siatki kolumn dzielnej.
Przy `indent=0`: `[−][6][ ]` → minus w kolumnie 0, cyfra 6 w kolumnie 1 (pod `7`).
A powinno być: minus **na lewo** od siatki, cyfra 6 w kolumnie 0 (pod `8`).

## Zasada

Znak `−` musi być **poza kolumnami dzielnej** — taki sam jak `×` w mnożeniu
czy `:` w wierszu dzielnej. Dzielna, iloraz i iloczyn wszystkie używają
tej samej siatki kolumn. Minus to tylko dekoracja po lewej stronie.

---

## Zmiana w `DivisionDisplay.tsx`

### 1. Ustal stałą szerokość kolumny "symbolu" (minus, dwukropek)

```typescript
// Symbol column — ta sama szerokość co cyfra ale poza siatką
const SYMBOL_COL = `${CELL_W} flex-shrink-0 flex items-center justify-center
  text-2xl sm:text-3xl font-bold ${textCls}`;
```

### 2. Napraw wiersz dzielna : dzielnik

Upewnij się że `:` jest renderowany jako osobna komórka poza siatką dzielnej:

```typescript
<div className="flex items-center">
  {/* Pusta kolumna symbolu (wyrównanie z minusami niżej) */}
  <div className={SYMBOL_COL}>&nbsp;</div>
  {/* Cyfry dzielnej */}
  {dividendStr.split('').map((d, i) => (
    <div key={i} className={givenCls}>{d}</div>
  ))}
  {/* Dwukropek */}
  <div className={`${CELL_W} flex-shrink-0 flex items-center justify-center
    text-2xl sm:text-3xl font-bold ${textCls}`}>:</div>
  {/* Cyfry dzielnika */}
  {divisorStr.split('').map((d, i) => (
    <div key={i} className={givenCls}>{d}</div>
  ))}
</div>
```

### 3. Napraw wiersz ilorazu

Iloraz musi też mieć pustą kolumnę symbolu z lewej:

```typescript
<div className="flex">
  {/* Pusta kolumna symbolu */}
  <div className={`${CELL_W} ${CELL_H} flex-shrink-0`} />
  {/* Cyfry ilorazu — nad cyframi dzielnej */}
  {dividendStr.split('').map((_, i) => {
    const subIdx = substeps.findIndex((s: any) => s.quotient_col === i);
    if (subIdx === -1) return <div key={i} className={`${CELL_W} ${CELL_H} flex-shrink-0`} />;
    const qcell = getQuotientCell(subIdx);
    if (!qcell) return <div key={i} className={`${CELL_W} ${CELL_H} flex-shrink-0`} />;
    return renderInput(qcell);
  })}
</div>
```

### 4. Napraw kreska nad dzielną

```typescript
<div className="flex">
  {/* Pusta kolumna symbolu */}
  <div className={`${CELL_W} flex-shrink-0`} />
  {/* Kreska tylko pod cyframi dzielnej */}
  <div
    className={`border-t-2 ${lineCol}`}
    style={{ width: `${dividendStr.length * cellPx}px` }}
  />
</div>
```

### 5. Napraw wiersze substepów — minus poza siatką

```typescript
{/* Wiersz przeniesień borrow */}
{hasBorrow && (
  <div className="flex">
    <div className={`${CELL_W} ${CELL_Hs} flex-shrink-0`} /> {/* pusta kolumna symbolu */}
    {Array(indent).fill(null).map((_, k) =>
      <div key={k} className={`${CELL_W} ${CELL_Hs} flex-shrink-0`} />
    )}
    {productStr.split('').map((_, pi) => {
      // ... kratki przeniesień jak poprzednio
    })}
  </div>
)}

{/* Iloczyn z minusem */}
<div className="flex items-center">
  {/* Minus w kolumnie symbolu */}
  <div className={SYMBOL_COL}>−</div>
  {/* Wcięcie wewnątrz siatki */}
  {Array(indent).fill(null).map((_, k) =>
    <div key={k} className={`${CELL_W} flex-shrink-0`} />
  )}
  {/* Cyfry iloczynu */}
  {productStr.split('').map((d, pi) => {
    const pcell = getProductCell(si, pi);
    if (pcell) return renderInput(pcell);
    return <div key={pi} className={givenCls}>{d}</div>;
  })}
</div>

{/* Kreska odejmowania */}
<div className="flex">
  <div className={`${CELL_W} flex-shrink-0`} /> {/* pusta kolumna symbolu */}
  {Array(indent).fill(null).map((_, k) =>
    <div key={k} style={{ width: cellPx }} className="flex-shrink-0" />
  )}
  <div
    className={`border-t-2 ${lineCol} my-0.5 flex-shrink-0`}
    style={{ width: `${sub.product_len * cellPx}px` }}
  />
</div>

{/* Reszta / następny current_value */}
<AnimatePresence>
  {isRemainderRevealed && (
    <motion.div className="flex" ...>
      {/* Pusta kolumna symbolu */}
      <div className={`${CELL_W} flex-shrink-0`} />
      {si < substeps.length - 1 ? (
        <>
          {Array(substeps[si + 1].quotient_col - substeps[si + 1].current_len + 1)
            .fill(null).map((_, k) =>
              <div key={k} className={`${CELL_W} flex-shrink-0`} />
          )}
          {String(substeps[si + 1].current_value).split('').map((d, k) => (
            <div key={k} className={givenCls}>{d}</div>
          ))}
        </>
      ) : (
        <>
          {Array(substeps[si].quotient_col)
            .fill(null).map((_, k) =>
              <div key={k} className={`${CELL_W} flex-shrink-0`} />
          )}
          <div className={givenCls}>{sub.remainder}</div>
        </>
      )}
    </motion.div>
  )}
</AnimatePresence>
```

---

## Checklist

### `879 ÷ 3 = 293`
```
    [2][9][3]
  ────────────
    8  7  9  :  3
  − 6            ← "6" pod "8" ✓
    ──
    2  7         ← pojawia się
  −    2  7      ← wcięcie 1, "27" pod "79" (dwie cyfry) — hmm
```

Dla `current=27` (pozycje 1-2 w dzielnej): `quotient_col=2`, `current_len=2`, `indent = 2-2+1 = 1`.
Czyli: `[pusta symbol][pusta kolumna 0][2][7]` → "27" pod "79" ✓

- [ ] `6` stoi pod `8` (nie pod `7`)
- [ ] `27` stoi pod `79`
- [ ] Wszystkie minusy wyrównane w jednej kolumnie z lewej strony siatki
- [ ] Kreska nad dzielną nie wychodzi poza cyfry dzielnej

### `689 ÷ 53 = 13`
```
      [1][3]
  ──────────────
    6  8  9  :  5  3
  −    5  3       ← indent=0, "53" pod "68"
```
- [ ] `53` pod `68` (nie pod `89`)
