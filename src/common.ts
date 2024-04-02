import { getInput } from "@actions/core";

export const sleep = (durationMs: number) => new Promise(
  res => setTimeout(res, durationMs))

export const getVar = (
  key: string,
  fallback: string | undefined = undefined,
) => {
  const value = process.env[key] ?? getInput(key);
  if (!value) {
    if (fallback) return fallback;
    throw new Error(`'${key}' not found`);
  }
  return value;
};

export const getDurationSeconds = (
  startTimeMs: number,
  endTimeMs: number,
): number => {
  return (endTimeMs - startTimeMs) / 1000
}