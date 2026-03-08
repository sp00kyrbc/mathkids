import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GridCell, CellState } from '../types/task';
import { useTheme } from '../hooks/useTheme';

interface MathGridProps {
  grid: GridCell[][];
  onCellInput: (row: number, col: number, value: string) => void;
  activeCell: { row: number; col: number } | null;
  showLine?: boolean;  // pokaż linię pod kreską
  lineRow?: number;    // który wiersz to linia
  cellSize?: number;   // rozmiar kratki w px (default 48)
}

// Kolory komórek zależnie od stanu i motywu
function getCellClasses(cell: GridCell, _isActive: boolean, theme: string): string {
  const base = 'flex items-center justify-center font-bold text-xl transition-all duration-150 select-none';
  const sizeClass = 'w-12 h-12 rounded';

  if (!cell.editable && cell.value === '') return `${base} ${sizeClass}`;
  if (cell.value === '—') return `${base} ${sizeClass} opacity-0`; // linia osobno

  if (theme === 'chalk') {
    const stateClasses: Record<CellState, string> = {
      empty: `border border-dashed border-chalk-line bg-transparent`,
      given: `text-chalk-text`,
      active: `border-2 border-chalk-accent bg-chalk-accent/10 shadow-lg shadow-chalk-accent/30`,
      'filled-correct': `text-chalk-success border border-chalk-success/30`,
      'filled-error': `text-chalk-error border-2 border-chalk-error bg-chalk-error/10 animate-shake`,
      revealed: `text-chalk-accent/70 border border-chalk-accent/30`,
    };
    return `${base} ${sizeClass} ${stateClasses[cell.state]} font-chalk`;
  } else {
    const stateClasses: Record<CellState, string> = {
      empty: `border border-dashed border-notebook-line bg-white`,
      given: `text-notebook-text`,
      active: `border-2 border-notebook-text bg-blue-50 shadow-md`,
      'filled-correct': `text-notebook-success border border-green-200`,
      'filled-error': `text-notebook-error border-2 border-red-400 bg-red-50 animate-shake`,
      revealed: `text-notebook-accent/80 border border-notebook-accent/30`,
    };
    return `${base} ${sizeClass} ${stateClasses[cell.state]} font-notebook`;
  }
}

export function MathGrid({ grid, onCellInput, activeCell, lineRow = 3 }: MathGridProps) {
  const { theme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fokus na ukrytym inpucie gdy aktywna komórka
  useEffect(() => {
    if (activeCell) inputRef.current?.focus();
  }, [activeCell]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!activeCell) return;
    const key = e.key;
    if (key >= '0' && key <= '9') {
      onCellInput(activeCell.row, activeCell.col, key);
    } else if (key === 'Backspace') {
      onCellInput(activeCell.row, activeCell.col, '');
    }
  }

  const lineColor = theme === 'chalk' ? 'border-chalk-text' : 'border-notebook-text';

  return (
    <div className="relative inline-block" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Ukryty input dla mobile keyboard */}
      <input
        ref={inputRef}
        type="number"
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        inputMode="numeric"
        pattern="[0-9]*"
        onChange={(e) => {
          if (activeCell && e.target.value) {
            const digit = e.target.value.slice(-1);
            if (digit >= '0' && digit <= '9') {
              onCellInput(activeCell.row, activeCell.col, digit);
              e.target.value = '';
            }
          }
        }}
      />

      <div className="flex flex-col gap-1">
        {grid.map((row, rowIdx) => (
          <div key={rowIdx}>
            {/* Linia pod kreską */}
            {rowIdx === lineRow && (
              <div className={`border-t-2 ${lineColor} my-1 mx-1`} />
            )}

            <div className="flex gap-1">
              {row.map((cell) => (
                <CellComponent
                  key={cell.id}
                  cell={cell}
                  isActive={
                    activeCell?.row === cell.row && activeCell?.col === cell.col
                  }
                  theme={theme}
                  onCellClick={() => {
                    if (cell.editable) {
                      onCellInput(cell.row, cell.col, '__focus__');
                    }
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CellComponent({
  cell, isActive, theme, onCellClick
}: {
  cell: GridCell;
  isActive: boolean;
  theme: string;
  onCellClick: () => void;
}) {
  const classes = getCellClasses(cell, isActive, theme);

  // Komórki puste (niewidoczne spacery)
  if (!cell.editable && !cell.value) {
    return <div className="w-12 h-12" />;
  }

  // Symbol operacji (po lewej)
  if (cell.value === '—') return null;

  return (
    <motion.div
      className={`${classes} ${cell.editable ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={onCellClick}
      whileTap={cell.editable ? { scale: 0.92 } : undefined}
    >
      <AnimatePresence mode="wait">
        {cell.value && cell.value !== '' && (
          <motion.span
            key={cell.value + cell.state}
            initial={{ opacity: 0, scale: 0.5, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15, type: 'spring', stiffness: 400 }}
            className={theme === 'chalk' ? 'chalk-text' : ''}
          >
            {cell.value}
          </motion.span>
        )}
        {(!cell.value || cell.value === '') && cell.editable && (
          <motion.span
            animate={isActive ? {
              opacity: [1, 0, 1],
              transition: { repeat: Infinity, duration: 1 }
            } : { opacity: 0.3 }}
            className="text-sm opacity-30"
          >
            ?
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
