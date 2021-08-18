import axios from "axios";
import { getEnv } from "./common";

const api =
  <T>(method: "post" | "get", path: string) =>
  (data?: Record<string, unknown>): Promise<T> =>
    new Promise((res, rej) => {
      axios
        .request({
          url: `https://api.vultr.com/v2/${path}`,
          method,
          headers: {
            Authorization: `Bearer ${getEnv("VULTR_API_KEY")}`,
          },
          data,
        })
        .then(({ data }) => res(data))
        .catch((err) => {
          rej(err.response?.data ?? err);
        });
    });

export const createInstance = api<CreateInstance>("post", "instances");

export const getInstance = (id: string) =>
  api<CreateInstance>("get", `instances/${id}`);

export const createDomain = api<CreateDomain>("post", "domains");

export const createRecord = (domain: string) =>
  api<CreateRecord>("post", `domains/${domain}/records`);

export const getInstanceIPAddress = async (
  id: string
): Promise<string | undefined> => {
  try {
    const { instance } = await getInstance(id)();
    return instance?.main_ip && instance.main_ip !== "0.0.0.0"
      ? instance.main_ip
      : undefined;
  } catch (err) {
    console.error(err);
    return undefined;
  }
};
