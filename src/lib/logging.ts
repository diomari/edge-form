type LogLevel = 'info' | 'warn' | 'error';

interface SafeLogFields {
  [key: string]: string | number | boolean | null | undefined;
}

const secretFieldPattern = /token|secret|key|password|authorization|cookie/i;

export function logEvent(level: LogLevel, event: string, fields: SafeLogFields = {}): void {
  const safeFields: SafeLogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    safeFields[key] = secretFieldPattern.test(key) ? '[redacted]' : value;
  }

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    ...safeFields,
  };

  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
