/**
 * Evaluates simple arithmetic expressions for salary input.
 * Supports:
 *   "3200"            → 3200
 *   "3200+500"        → 3700
 *   "3200-200"        → 3000
 *   "3200*2"          → 6400
 *   "3200/100"        → 32
 *   "3200*25%"        → 3200 + (3200 * 25/100) = 4000  (percentage markup)
 *   "3200+25%"        → 3200 + (3200 * 25/100) = 4000  (same as *%)
 *   "3200-25%"        → 3200 - (3200 * 25/100) = 2400  (percentage discount)
 * Returns a finite number on success, or null on parse failure.
 */
export const evaluateSalaryExpression = (input) => {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  if (s === "") return 0;

  // Plain number
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }

  // Binary expression: <num> <op> <num>[%]
  const m = s.match(/^(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)(%?)$/);
  if (!m) return null;

  const a = parseFloat(m[1]);
  const op = m[2];
  const b = parseFloat(m[3]);
  const isPct = m[4] === "%";
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  let result;
  if (isPct) {
    const pctAmount = (a * b) / 100;
    if (op === "+" || op === "*") result = a + pctAmount;
    else if (op === "-") result = a - pctAmount;
    else if (op === "/") result = b !== 0 ? a / (b / 100) : null;
  } else {
    if (op === "+") result = a + b;
    else if (op === "-") result = a - b;
    else if (op === "*") result = a * b;
    else if (op === "/") result = b !== 0 ? a / b : null;
  }
  if (result === null || !Number.isFinite(result)) return null;
  return Math.round(result * 100) / 100;
};
