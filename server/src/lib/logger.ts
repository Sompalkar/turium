type Level = "info" | "warn" | "error";

type Fields = Record<string, unknown>;

 
function emit(level: Level, message: string, fields: Fields = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...fields,
  });
  if (level === "error") console.error(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, fields?: Fields) => emit("info", message, fields),
  warn: (message: string, fields?: Fields) => emit("warn", message, fields),
  error: (message: string, fields?: Fields) => emit("error", message, fields),

  child(base: Fields) {
    return {
      info: (message: string, fields?: Fields) => emit("info", message, { ...base, ...fields }),
      warn: (message: string, fields?: Fields) => emit("warn", message, { ...base, ...fields }),
      error: (message: string, fields?: Fields) => emit("error", message, { ...base, ...fields }),
    };
  },
};

export type Logger = ReturnType<typeof logger.child>;
