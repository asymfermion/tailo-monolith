export type LogLevel = 'info' | 'warn' | 'error';

export type FunctionLogger = {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
};

function writeLog(
  functionName: string,
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): void {
  const line = JSON.stringify({
    level,
    function: functionName,
    message,
    ts: new Date().toISOString(),
    ...context,
  });

  if (level === 'error') {
    console.error(line);
    return;
  }

  console.log(line);
}

export function createFunctionLogger(functionName: string): FunctionLogger {
  return {
    info: (message, context) => writeLog(functionName, 'info', message, context),
    warn: (message, context) => writeLog(functionName, 'warn', message, context),
    error: (message, context) =>
      writeLog(functionName, 'error', message, context),
  };
}
