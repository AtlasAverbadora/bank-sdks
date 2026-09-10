export type ParsedFlags = { positional: string[]; flags: Record<string, string> };

export function parseFlags(args: string[]): ParsedFlags {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (arg.startsWith("--")) {
      const name = arg.slice(2);
      const value = args[i + 1];
      if (value === undefined || value.startsWith("--")) throw new Error(`Flag --${name} exige um valor.`);
      flags[name] = value;
      i += 1;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}
