#!/usr/bin/env python3
"""Szybki test silnika arytmetycznego."""
import json
from arithmetic_engine import generate_task, validate_step

def test_all():
    for op in ["addition", "subtraction", "multiplication", "division"]:
        task = generate_task(op, 3, 2)
        print(f"\n{'='*50}")
        print(f"Operacja: {op}")
        print(f"Zadanie: {task['question']}")
        print(f"Wynik: {task['result']}")
        print(f"Liczba kroków: {len(task['steps'])}")
        print(f"Pierwsze kroki:")
        for s in task['steps'][:3]:
            print(f"  Krok {s['step_id']}: {s['description']}")

if __name__ == "__main__":
    test_all()
