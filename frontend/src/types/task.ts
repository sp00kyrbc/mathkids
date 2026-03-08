export type Operation = 'addition' | 'subtraction' | 'multiplication' | 'division';

export interface TaskStep {
  step_id: number;
  description: string;
  column: number;
  input_digits: number[];
  result_digit: number;
  carry_in: number;
  carry_out: number;
  borrow: boolean;
  position: 'result' | 'carry' | 'partial' | 'remainder';
  row: number | null;
  hint: string;
}

export interface TaskLayout {
  type: 'vertical' | 'multiplication' | 'division';
  cols: number;
  operand1: string;
  operand2: string;
  result: string;
  symbol: string;
  max_len: number;
  carries?: Record<number, number>;
  borrows?: Record<number, boolean>;
  partials?: PartialResult[];
  substeps?: DivisionSubstep[];
  // Pola specyficzne dla dzielenia
  dividend?: string;
  divisor?: string;
  quotient?: string;
  remainder?: number;
}

export interface PartialResult {
  multiplier_digit: number;
  multiplier_position: number;
  shift: number;
  value: number;
  display: string;
}

export interface DivisionSubstep {
  position: number;
  current_value: number;
  quotient_digit: number;
  product: number;
  remainder: number;
}

export interface Task {
  operation: Operation;
  operand1: number;
  operand2: number;
  result: number;
  remainder: number;
  steps: TaskStep[];
  layout: TaskLayout;
  difficulty: number;
  symbol: string;
  question: string;
  partials?: PartialResult[];
  division_steps?: DivisionSubstep[];
}

// Stan komórki w siatce
export type CellState = 'empty' | 'given' | 'active' | 'filled-correct' | 'filled-error' | 'revealed';

export interface GridCell {
  id: string;            // np. "r2-c3"
  row: number;
  col: number;
  value: string;         // cyfra lub '' lub ' '
  state: CellState;
  editable: boolean;     // czy dziecko może tu wpisać
  stepId: number | null; // który krok zadania
}
