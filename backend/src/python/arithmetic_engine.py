#!/usr/bin/env python3
"""
Silnik arytmetyczny dla MathKids.
Generuje zadania i oblicza kroki działań pisemnych.
"""

import json
import sys
import random
from typing import Optional
from dataclasses import dataclass, asdict


# ─────────────────────────────────────────────
# STRUKTURY DANYCH
# ─────────────────────────────────────────────

@dataclass
class Step:
    """Jeden krok działania pisemnego."""
    step_id: int           # numer kroku (0-indexed)
    description: str       # opis po polsku np. "Dodaję cyfry jedności: 6 + 7 = 13"
    column: int            # której kolumny dotyczy (0 = jedności, 1 = dziesiątki, ...)
    input_digits: list     # cyfry wejściowe w tej kolumnie
    result_digit: int      # cyfra którą wpisujemy w wynik
    carry_in: int          # przeniesienie wchodzące (0 lub 1)
    carry_out: int         # przeniesienie wychodzące (0 lub 1)
    borrow: bool           # czy pożyczyliśmy (odejmowanie)
    position: str          # "result" | "carry" | "partial" | "remainder"
    row: Optional[int]     # dla mnożenia: numer wiersza cząstkowego
    hint: str              # wskazówka dla dziecka


@dataclass
class ArithmeticTask:
    """Pełne zadanie z krokami."""
    operation: str         # "addition" | "subtraction" | "multiplication" | "division"
    operand1: int
    operand2: int
    result: int
    remainder: int         # dla dzielenia
    steps: list            # lista Step
    layout: dict           # układ graficzny (siatka)
    difficulty: int        # 1-5


# ─────────────────────────────────────────────
# GENERATOR ZADAŃ
# ─────────────────────────────────────────────

def generate_task(operation: str, max_digits1: int, max_digits2: int) -> dict:
    """
    Generuje zadanie i oblicza wszystkie kroki.

    Args:
        operation: "addition" | "subtraction" | "multiplication" | "division"
        max_digits1: maks liczba cyfr pierwszego składnika (1-6)
        max_digits2: maks liczba cyfr drugiego składnika (1-6)

    Returns:
        dict z pełnym zadaniem i krokami
    """
    if operation == "addition":
        return _generate_addition(max_digits1, max_digits2)
    elif operation == "subtraction":
        return _generate_subtraction(max_digits1, max_digits2)
    elif operation == "multiplication":
        return _generate_multiplication(max_digits1, max_digits2)
    elif operation == "division":
        return _generate_division(max_digits1, max_digits2)
    else:
        raise ValueError(f"Nieznana operacja: {operation}")


def _random_number(max_digits: int, min_val: int = 1) -> int:
    """Losuje liczbę o maksymalnie max_digits cyfrach."""
    max_val = 10 ** max_digits - 1
    min_val = max(min_val, 10 ** (max(1, max_digits - 1) - 1))
    if max_digits == 1:
        min_val = 1
    return random.randint(min_val, max_val)


# ─────────────────────────────────────────────
# DODAWANIE
# ─────────────────────────────────────────────

def _generate_addition(max_digits1: int, max_digits2: int) -> dict:
    a = _random_number(max_digits1)
    b = _random_number(max_digits2)
    result = a + b
    steps = _compute_addition_steps(a, b)
    layout = _build_addition_layout(a, b, result, steps)

    return {
        "operation": "addition",
        "operand1": a,
        "operand2": b,
        "result": result,
        "remainder": 0,
        "steps": [asdict(s) for s in steps],
        "layout": layout,
        "difficulty": max(max_digits1, max_digits2),
        "symbol": "+",
        "question": f"{a} + {b} = ?"
    }


def _compute_addition_steps(a: int, b: int) -> list:
    """Oblicza kroki dodawania pod kreską."""
    digits_a = _to_digits(a)
    digits_b = _to_digits(b)
    max_len = max(len(digits_a), len(digits_b)) + 1  # +1 na ewentualne przeniesienie

    # Wyrównaj do tej samej długości (wypełnij zerami z lewej)
    digits_a = [0] * (max_len - len(digits_a)) + digits_a
    digits_b = [0] * (max_len - len(digits_b)) + digits_b

    steps = []
    carry = 0
    step_id = 0
    position_names = ["jedności", "dziesiątek", "setek", "tysięcy", "dziesiątek tysięcy", "setek tysięcy"]

    for col in range(max_len - 1, -1, -1):
        col_index = max_len - 1 - col  # 0 = jedności
        d_a = digits_a[col]
        d_b = digits_b[col]
        total = d_a + d_b + carry
        result_digit = total % 10
        new_carry = total // 10

        pos_name = position_names[min(col_index, len(position_names) - 1)]

        if d_a == 0 and d_b == 0 and carry == 0:
            break  # Nie ma więcej cyfr

        # Opis kroku
        if carry > 0:
            desc = f"Dodaję cyfry {pos_name}: {d_a} + {d_b} + {carry} (przeniesienie) = {total}"
        else:
            desc = f"Dodaję cyfry {pos_name}: {d_a} + {d_b} = {total}"

        if new_carry > 0:
            desc += f". Zapisuję {result_digit}, przenoszę {new_carry}."
        else:
            desc += f". Zapisuję {result_digit}."

        hint = f"Ile to {d_a} + {d_b}" + (f" + {carry}" if carry > 0 else "") + "?"

        step = Step(
            step_id=step_id,
            description=desc,
            column=col_index,
            input_digits=[d_a, d_b],
            result_digit=result_digit,
            carry_in=carry,
            carry_out=new_carry,
            borrow=False,
            position="result",
            row=None,
            hint=hint
        )
        steps.append(step)
        step_id += 1

        # Dodaj krok przeniesienia jeśli jest
        if new_carry > 0:
            carry_step = Step(
                step_id=step_id,
                description=f"Przenoszę {new_carry} na kolumnę {position_names[min(col_index+1, len(position_names)-1)]}.",
                column=col_index + 1,
                input_digits=[],
                result_digit=new_carry,
                carry_in=0,
                carry_out=0,
                borrow=False,
                position="carry",
                row=None,
                hint=f"Zapiszę przeniesienie {new_carry} nad następną kolumną."
            )
            steps.append(carry_step)
            step_id += 1

        carry = new_carry

    return steps


# ─────────────────────────────────────────────
# ODEJMOWANIE
# ─────────────────────────────────────────────

def _generate_subtraction(max_digits1: int, max_digits2: int) -> dict:
    """Generuje odejmowanie, zawsze a >= b (wynik >= 0)."""
    a = _random_number(max_digits1)
    b = _random_number(min(max_digits2, max_digits1))
    if b > a:
        a, b = b, a  # Zamień żeby wynik był nieujemny
    if a == b:
        a += random.randint(1, 9)
    result = a - b
    steps = _compute_subtraction_steps(a, b)
    layout = _build_subtraction_layout(a, b, result, steps)

    return {
        "operation": "subtraction",
        "operand1": a,
        "operand2": b,
        "result": result,
        "remainder": 0,
        "steps": [asdict(s) for s in steps],
        "layout": layout,
        "difficulty": max_digits1,
        "symbol": "\u2212",
        "question": f"{a} \u2212 {b} = ?"
    }


def _compute_subtraction_steps(a: int, b: int) -> list:
    """Oblicza kroki odejmowania pod kreską (z pożyczaniem)."""
    digits_a = _to_digits(a)
    digits_b = _to_digits(b)
    max_len = max(len(digits_a), len(digits_b))

    digits_a = [0] * (max_len - len(digits_a)) + digits_a
    digits_b = [0] * (max_len - len(digits_b)) + digits_b

    # Kopia do modyfikacji (pożyczanie)
    working_a = digits_a[:]

    steps = []
    step_id = 0
    position_names = ["jedności", "dziesiątek", "setek", "tysięcy", "dziesiątek tysięcy", "setek tysięcy"]

    for col in range(max_len - 1, -1, -1):
        col_index = max_len - 1 - col
        d_a = working_a[col]
        d_b = digits_b[col]

        if d_a == 0 and d_b == 0:
            continue

        pos_name = position_names[min(col_index, len(position_names) - 1)]
        borrowed = False

        if d_a < d_b:
            # Pożyczamy z lewej kolumny
            borrowed = True
            # Znajdź pierwszą niezerową kolumnę po lewej
            borrow_col = col - 1
            while borrow_col >= 0 and working_a[borrow_col] == 0:
                working_a[borrow_col] += 9  # 0 → 10, oddamy 1 = 9
                borrow_col -= 1
            working_a[borrow_col] -= 1
            d_a += 10
            working_a[col] = d_a

        result_digit = d_a - d_b

        if borrowed:
            desc = f"Odejmuj\u0119 cyfry {pos_name}: {d_a - 10} jest za ma\u0142e, po\u017Cyczam 10. {d_a} \u2212 {d_b} = {result_digit}."
            hint = f"{d_a - 10} jest mniejsze ni\u017C {d_b}. Po\u017Cycz 10 z s\u0105siedniej kolumny i oblicz {d_a} \u2212 {d_b}."
        else:
            desc = f"Odejmuj\u0119 cyfry {pos_name}: {d_a} \u2212 {d_b} = {result_digit}."
            hint = f"Ile to {d_a} \u2212 {d_b}?"

        step = Step(
            step_id=step_id,
            description=desc,
            column=col_index,
            input_digits=[d_a if borrowed else d_a, d_b],
            result_digit=result_digit,
            carry_in=0,
            carry_out=0,
            borrow=borrowed,
            position="result",
            row=None,
            hint=hint
        )
        steps.append(step)
        step_id += 1

    return steps


# ─────────────────────────────────────────────
# MNOŻENIE
# ─────────────────────────────────────────────

def _generate_multiplication(max_digits1: int, max_digits2: int) -> dict:
    """Generuje mnożenie. max_digits2 max = 2 dla czytelności."""
    max_digits2 = min(max_digits2, 2)
    a = _random_number(max_digits1)
    b = _random_number(max_digits2)
    if b < 10:
        b = random.randint(2, 9)
    result = a * b
    steps, partials = _compute_multiplication_steps(a, b)
    layout = _build_multiplication_layout(a, b, result, partials)

    return {
        "operation": "multiplication",
        "operand1": a,
        "operand2": b,
        "result": result,
        "remainder": 0,
        "steps": [asdict(s) for s in steps],
        "partials": partials,
        "layout": layout,
        "difficulty": max_digits1,
        "symbol": "\u00D7",
        "question": f"{a} \u00D7 {b} = ?"
    }


def _compute_multiplication_steps(a: int, b: int) -> tuple:
    """Oblicza kroki mnożenia pod kreską (polska szkoła)."""
    b_str = str(b)
    b_digits = [int(c) for c in reversed(b_str)]  # jedności pierwsze
    a_str = str(a)
    a_digits_rev = [int(c) for c in reversed(a_str)]

    partials = []
    all_steps = []
    step_id = 0

    for shift, digit_b in enumerate(b_digits):
        partial_value = a * digit_b

        # Oblicz przeniesienia wiersza cząstkowego
        carry = 0
        carries_for_row = {}
        for col, digit_a in enumerate(a_digits_rev):
            product = digit_a * digit_b + carry
            carry = product // 10
            if carry > 0:
                carries_for_row[col + 1] = carry

        partials.append({
            "value": partial_value,
            "shift": shift,
            "digit_used": digit_b,
            "carries": carries_for_row,
        })

        # Kroki przeniesień (carry) — dziecko je wpisuje
        for col_fr, carry_val in sorted(carries_for_row.items()):
            all_steps.append(Step(
                step_id=step_id,
                position="carry",
                row=shift,
                column=col_fr,
                result_digit=carry_val,
                description=f"Przenosz\u0119 {carry_val} do nast\u0119pnej kolumny (wiersz {shift+1}).",
                hint="Ile przenosz\u0119?",
                carry_in=0,
                carry_out=carry_val,
                borrow=False,
                input_digits=[digit_b],
            ))
            step_id += 1

        # Kroki cyfr wyniku cząstkowego (od prawej)
        for col, d in enumerate(reversed(str(partial_value))):
            all_steps.append(Step(
                step_id=step_id,
                position="partial",
                row=shift,
                column=col,
                result_digit=int(d),
                description=f"Mno\u017C\u0119: {a_str[-(col+1)] if col < len(a_str) else 0} \u00D7 {digit_b}. Cyfra: {d}.",
                hint=f"Ile to {digit_b} \u00D7 ... ?",
                carry_in=0,
                carry_out=0,
                borrow=False,
                input_digits=[digit_b],
            ))
            step_id += 1

    # Wynik końcowy
    result = a * b
    for col, d in enumerate(reversed(str(result))):
        all_steps.append(Step(
            step_id=step_id,
            position="result",
            row=None,
            column=col,
            result_digit=int(d),
            description=f"Dodaj wyniki cz\u0105stkowe. Cyfra wyniku: {d}.",
            hint="Dodaj kolumn\u0119 pionowo.",
            carry_in=0,
            carry_out=0,
            borrow=False,
            input_digits=[],
        ))
        step_id += 1

    return all_steps, partials


# ─────────────────────────────────────────────
# DZIELENIE
# ─────────────────────────────────────────────

def _generate_division(max_digits1: int, max_digits2: int) -> dict:
    """Generuje dzielenie bez reszty (dla uproszczenia v1)."""
    max_digits2 = min(max_digits2, 2)  # dzielnik max 2 cyfrowy
    divisor = _random_number(max_digits2, min_val=2)
    quotient = _random_number(max(1, max_digits1 - max_digits2 + 1))
    dividend = divisor * quotient

    # Upewnij się że dzielna ma odpowiednią liczbę cyfr
    while len(str(dividend)) > max_digits1:
        quotient = _random_number(max(1, max_digits1 - max_digits2))
        dividend = divisor * quotient

    steps, substeps = _compute_division_steps(dividend, divisor)
    layout = _build_division_layout(dividend, divisor, quotient, 0, substeps)

    return {
        "operation": "division",
        "operand1": dividend,
        "operand2": divisor,
        "result": quotient,
        "remainder": 0,
        "steps": [asdict(s) for s in steps],
        "division_steps": substeps,
        "layout": layout,
        "difficulty": len(str(dividend)),
        "symbol": "\u00F7",
        "question": f"{dividend} \u00F7 {divisor} = ?"
    }


def _compute_division_steps(dividend: int, divisor: int) -> tuple:
    """Oblicza kroki dzielenia pisemnego (polska metoda)."""
    dividend_str = str(dividend)
    steps = []
    substeps = []  # podkroki: bieżąca reszta, cyfra wyniku, iloczyn
    step_id = 0

    current = 0
    quotient_digits = []

    for i, digit_char in enumerate(dividend_str):
        current = current * 10 + int(digit_char)
        q_digit = current // divisor
        product = q_digit * divisor
        remainder = current - product

        quotient_digits.append(q_digit)

        desc = f"Bior\u0119 {current}. {current} \u00F7 {divisor} = {q_digit} (bo {q_digit} \u00D7 {divisor} = {product}). Reszta: {remainder}."
        hint = f"Ile razy {divisor} mie\u015Bci si\u0119 w {current}?"

        substep = {
            "position": i,
            "current_value": current,
            "quotient_digit": q_digit,
            "product": product,
            "remainder": remainder,
            "digits_taken": dividend_str[:i+1]
        }
        substeps.append(substep)

        step = Step(
            step_id=step_id,
            description=desc,
            column=i,
            input_digits=[current, divisor],
            result_digit=q_digit,
            carry_in=0,
            carry_out=remainder,
            borrow=False,
            position="result",
            row=None,
            hint=hint
        )
        steps.append(step)
        step_id += 1

        current = remainder

    return steps, substeps


# ─────────────────────────────────────────────
# UKŁADY GRAFICZNE (layout)
# ─────────────────────────────────────────────

def _build_addition_layout(a: int, b: int, result: int, steps: list) -> dict:
    """Buduje układ graficzny dla dodawania (siatka kratek)."""
    a_str = str(a)
    b_str = str(b)
    r_str = str(result)
    max_len = max(len(a_str), len(b_str), len(r_str))

    # Przeniesienia
    carries = {}
    for s in steps:
        if s.position == "carry":
            carries[s.column] = s.result_digit

    return {
        "type": "vertical",
        "cols": max_len + 2,  # +2 na margines i ewentualne przeniesienia
        "rows": 5,  # carries, a, b, linia, wynik
        "carries_row": 0,
        "operand1_row": 1,
        "operand2_row": 2,
        "line_row": 3,
        "result_row": 4,
        "operand1": a_str.zfill(max_len),
        "operand2": b_str.zfill(max_len),
        "result": r_str.zfill(max_len),
        "carries": carries,
        "symbol": "+",
        "max_len": max_len
    }


def _build_subtraction_layout(a: int, b: int, result: int, steps: list) -> dict:
    a_str = str(a)
    b_str = str(b)
    r_str = str(result)
    max_len = max(len(a_str), len(b_str), len(r_str))

    borrows = {}
    for s in steps:
        if s.borrow:
            borrows[s.column] = True

    return {
        "type": "vertical",
        "cols": max_len + 2,
        "rows": 4,
        "operand1_row": 0,
        "operand2_row": 1,
        "line_row": 2,
        "result_row": 3,
        "operand1": a_str.zfill(max_len),
        "operand2": b_str.zfill(max_len),
        "result": r_str.zfill(max_len),
        "borrows": borrows,
        "symbol": "\u2212",
        "max_len": max_len
    }


def _build_multiplication_layout(a: int, b: int, result: int, partials: list) -> dict:
    a_str = str(a)
    b_str = str(b)
    r_str = str(result)
    max_len = max(len(a_str), len(b_str), len(r_str),
                  max(len(str(p['value'])) + p['shift'] for p in partials) if partials else 0)

    return {
        "type": "multiplication",
        "operand1": a_str.zfill(max_len),
        "operand2": b_str.zfill(max_len),
        "result": r_str.zfill(max_len),
        "partials": partials,
        "symbol": "\u00D7",
        "max_len": max_len
    }


def _build_division_layout(dividend: int, divisor: int, quotient: int, remainder: int, substeps: list) -> dict:
    return {
        "type": "division",
        "dividend": str(dividend),
        "divisor": str(divisor),
        "quotient": str(quotient),
        "remainder": remainder,
        "substeps": substeps,
        "symbol": "\u00F7"
    }


# ─────────────────────────────────────────────
# WALIDACJA
# ─────────────────────────────────────────────

def validate_step(operation: str, step_id: int, task_data: dict, user_answer: int) -> dict:
    """
    Waliduje odpowiedź dziecka dla konkretnego kroku.

    Returns:
        dict: { correct: bool, expected: int, feedback: str }
    """
    steps = task_data.get("steps", [])
    if step_id >= len(steps):
        return {"correct": False, "expected": -1, "feedback": "Nieprawidłowy numer kroku."}

    step = steps[step_id]
    expected = step["result_digit"]
    correct = user_answer == expected

    if correct:
        feedback = "Świetnie! To poprawna cyfra! ✓"
    else:
        feedback = f"Nie całkiem. Sprawdź jeszcze raz: {step['hint']}"

    return {
        "correct": correct,
        "expected": expected,
        "feedback": feedback,
        "step_description": step["description"]
    }


def validate_final_result(task_data: dict, user_answer: int) -> dict:
    """Waliduje końcowy wynik zadania."""
    expected = task_data["result"]
    correct = user_answer == expected
    return {
        "correct": correct,
        "expected": expected,
        "feedback": "Brawo! Wynik jest poprawny! 🎉" if correct else f"Wynik powinien być {expected}. Sprawdź obliczenia."
    }


# ─────────────────────────────────────────────
# POMOCNICZE
# ─────────────────────────────────────────────

def _to_digits(n: int) -> list:
    """Zamienia liczbę na listę cyfr [najstarsza, ..., najmłodsza]."""
    return [int(d) for d in str(n)]


# ─────────────────────────────────────────────
# PUNKT WEJŚCIA (wywołanie przez Node.js)
# ─────────────────────────────────────────────

if __name__ == "__main__":
    """
    Node.js wywołuje ten skrypt przez child_process.spawn.
    Wejście: JSON na stdin
    Wyjście: JSON na stdout
    """
    try:
        input_data = json.loads(sys.stdin.read())
        action = input_data.get("action")

        if action == "generate":
            result = generate_task(
                operation=input_data["operation"],
                max_digits1=input_data.get("max_digits1", 3),
                max_digits2=input_data.get("max_digits2", 3)
            )
            print(json.dumps({"success": True, "data": result}))

        elif action == "validate_step":
            result = validate_step(
                operation=input_data["operation"],
                step_id=input_data["step_id"],
                task_data=input_data["task_data"],
                user_answer=input_data["user_answer"]
            )
            print(json.dumps({"success": True, "data": result}))

        elif action == "validate_final":
            result = validate_final_result(
                task_data=input_data["task_data"],
                user_answer=input_data["user_answer"]
            )
            print(json.dumps({"success": True, "data": result}))

        else:
            print(json.dumps({"success": False, "error": f"Nieznana akcja: {action}"}))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
