const ts = () => new Date().toISOString().slice(11, 23);

export const log = {
  info:  (msg: string, ...args: unknown[]) => console.log(`\x1b[36m[${ts()}] INFO \x1b[0m ${msg}`, ...args),
  tool:  (msg: string, ...args: unknown[]) => console.log(`\x1b[33m[${ts()}] TOOL \x1b[0m ${msg}`, ...args),
  agent: (msg: string, ...args: unknown[]) => console.log(`\x1b[35m[${ts()}] AGNT \x1b[0m ${msg}`, ...args),
  ok:    (msg: string, ...args: unknown[]) => console.log(`\x1b[32m[${ts()}] OK   \x1b[0m ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`\x1b[31m[${ts()}] ERR  \x1b[0m ${msg}`, ...args),
};
