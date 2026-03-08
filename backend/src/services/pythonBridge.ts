import { spawn } from 'child_process';
import path from 'path';

const PYTHON_SCRIPT = path.join(__dirname, '../python/arithmetic_engine.py');

/**
 * Wywoluje Python silnik arytmetyczny.
 * Komunikacja przez stdin/stdout JSON.
 */
export function callPython(input: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [PYTHON_SCRIPT], {
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
      }
    });

    let stdout = '';
    let stderr = '';

    python.stdout.setEncoding('utf8');
    python.stderr.setEncoding('utf8');

    python.stdout.on('data', (data: string) => { stdout += data; });
    python.stderr.on('data', (data: string) => { stderr += data; });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python stderr:', stderr);
        reject(new Error(`Python exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        const result = JSON.parse(stdout.trim());
        if (!result.success) {
          reject(new Error(result.error || 'Python returned error'));
          return;
        }
        resolve(result.data);
      } catch (e) {
        reject(new Error(`JSON parse error: ${stdout}`));
      }
    });

    python.on('error', (err) => {
      reject(new Error(`Cannot start Python: ${err.message}`));
    });

    python.stdin.write(JSON.stringify(input));
    python.stdin.end();
  });
}
