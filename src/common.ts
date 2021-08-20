import { getInput } from "@actions/core";

export const getEnv = (matcher: string) => {
  if (process.env[matcher]) return process.env[matcher];

  return Object.entries(process.env).reduce((acc: any, [k, v]) => {
    const m = RegExp(matcher).exec(k);
    if (m?.[1]) {
      acc[m[1].toLowerCase()] = v;
    }
    return acc;
  }, {} as Record<string, string>);
};

export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const get = (key: string) => {
  const value = process.env[key.replace(/-/g, "_")] ?? getInput(key);
  if (!value) throw new Error(`'${key}' not found`);
  return value;
};

export const log = (...x: any) => {
  try {
    console.log(JSON.stringify(x, null, 2));
  } catch (err) {
    console.log(x);
  }
};
