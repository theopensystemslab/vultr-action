import { getInput } from "@actions/core";

export const VULTR_OS_ID_BY_OS = {
  alpine: '2076', // Alpine Linux x64
  core: '391', // Fedora CoreOS Stable
  flatcar: '2075', // Flatcar Container Linux LTS x64
  ubuntu: '1743', // Ubuntu 22.04 LTS x64
  ubuntu24: '2284', // Ubuntu 24.04 LTS x64
} as const

export const sleep = (durationMs: number) =>
  new Promise((res) => setTimeout(res, durationMs));

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

export const getOsId = (osType: string): string | undefined => {
  if (osType in VULTR_OS_ID_BY_OS) {
    return VULTR_OS_ID_BY_OS[osType as keyof typeof VULTR_OS_ID_BY_OS];
  }
  return undefined;
}

export const getDurationSeconds = (
  startTimeMs: number,
  endTimeMs: number,
): number => {
  return (endTimeMs - startTimeMs) / 1000;
};
