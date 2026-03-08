import { spawn } from 'child_process';
import path from 'path';

const PYTHON_SCRIPT = path.join(__dirname, '../python/arithmetic_engine.py');

/**
 * Wywołuje Python silnik arytmetyczny.
 * Komunikacja przez stdin/stdout JSON.
 */
export function callPython(input: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [PYTHON_SCRIPT]);
    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => { stdout += data.toString(); });
    python.stderr.on('data', (data) => { stderr += data.toString(); });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python stderr:', stderr);
        reject(new Error(`Python zakończył się kodem ${code}: ${stderr}`));
        return;
      }
      try {
        const result = JSON.parse(stdout.trim());
        if (!result.success) {
          reject(new Error(result.error || 'Python zwrócił błąd'));
          return;
        }
        resolve(result.data);
      } catch (e) {
        reject(new Error(`Nie można sparsować odpowiedzi Pythona: ${stdout}`));
      }
    });

    python.on('error', (err) => {
      reject(new Error(`Nie można uruchomić Pythona: ${err.message}`));
    });

    // Wyślij dane do Pythona przez stdin
    python.stdin.write(JSON.stringify(input));
    python.stdin.end();
  });
}
