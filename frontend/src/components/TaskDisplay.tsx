import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Task, GridCell } from '../types/task';
import { MathGrid } from './MathGrid';
import { buildGrid } from '../utils/gridBuilder';
import { useTheme } from '../hooks/useTheme';

const API = import.meta.env.VITE_API_URL;

interface TaskDisplayProps {
  task: Task;
  mode: 'tutorial' | 'practice' | 'test';
  currentStepId: number;
  onStepComplete: (correct: boolean) => void;
  onTaskComplete: (correct: boolean) => void;
  feedbackMode?: 'immediate' | 'after';
}

export function TaskDisplay({
  task, mode, currentStepId,
  onStepComplete, onTaskComplete,
  feedbackMode = 'immediate'
}: TaskDisplayProps) {
  const { classes, theme } = useTheme();
  const [grid, setGrid] = useState<GridCell[][]>(() => buildGrid(task));
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'hint' } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Znajdź aktualną aktywną komórkę na podstawie kroku
  const activateStepCell = useCallback((stepId: number) => {
    for (const row of grid) {
      for (const cell of row) {
        if (cell.stepId === stepId && cell.editable) {
          setActiveCell({ row: cell.row, col: cell.col });
          return;
        }
      }
    }
  }, [grid]);

  async function handleCellInput(row: number, col: number, value: string) {
    if (value === '__focus__') {
      setActiveCell({ row, col });
      return;
    }

    // Zaktualizuj komórkę
    const newGrid = grid.map(r => r.map(c => {
      if (c.row === row && c.col === col) {
        return { ...c, value, state: value ? 'filled-correct' as const : 'empty' as const };
      }
      return c;
    }));

    if (!value) {
      setGrid(newGrid);
      return;
    }

    // Walidacja
    if (mode !== 'test' && feedbackMode === 'immediate') {
      setIsValidating(true);
      try {
        const cell = grid[row][col];
        if (cell.stepId !== null) {
          const res = await fetch(`${API}/api/validate/step`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: task.operation,
              step_id: cell.stepId,
              task_data: task,
              user_answer: Number(value)
            })
          });
          const result = await res.json();

          setGrid(newGrid.map(r => r.map(c => {
            if (c.row === row && c.col === col) {
              return {
                ...c,
                value,
                state: result.correct ? 'filled-correct' : 'filled-error'
              };
            }
            return c;
          })));

          setFeedback({
            message: result.feedback,
            type: result.correct ? 'success' : 'error'
          });

          onStepComplete(result.correct);
        }
      } catch (e) {
        console.error('Błąd walidacji:', e);
      } finally {
        setIsValidating(false);
      }
    } else {
      setGrid(newGrid);
    }
  }

  const currentStep = task.steps[currentStepId];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Pytanie */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-2xl font-bold ${classes.text} text-center`}
      >
        {task.question}
      </motion.div>

      {/* Opis kroku (tutorial mode) */}
      {mode === 'tutorial' && currentStep && (
        <motion.div
          key={currentStepId}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${classes.card} p-3 max-w-sm text-center`}
        >
          <p className={`text-sm ${classes.text}`}>{currentStep.description}</p>
          {currentStep.hint && (
            <p className={`text-xs mt-1 opacity-70 ${classes.text}`}>
              💡 {currentStep.hint}
            </p>
          )}
        </motion.div>
      )}

      {/* Siatka */}
      <div className={`p-4 rounded-2xl ${classes.gridBg} ${theme === 'chalk' ? 'chalk-texture' : 'notebook-grid'}`}>
        <MathGrid
          grid={grid}
          onCellInput={handleCellInput}
          activeCell={activeCell}
          lineRow={task.operation === 'addition' || task.operation === 'subtraction' ? 3 : 2}
        />
      </div>

      {/* Feedback */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`${classes.card} p-3 max-w-sm text-center`}
        >
          <p className={`font-bold ${feedback.type === 'success' ? classes.success : classes.error}`}>
            {feedback.message}
          </p>
        </motion.div>
      )}

      {/* Wskaźnik ładowania */}
      {isValidating && (
        <div className={`text-sm ${classes.text} opacity-50`}>Sprawdzam...</div>
      )}
    </div>
  );
}
