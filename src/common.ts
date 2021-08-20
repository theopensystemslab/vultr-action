import { getInput } from "@actions/core";

export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const get = (key: string) => {
  const value = process.env[key] ?? getInput(key);
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
