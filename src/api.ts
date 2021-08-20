import axios from "axios";
import { get, sleep } from "./common";
import type { Vultr } from "./vultr";

const api =
  <T>(method: "post" | "get", path: string) =>
  (data?: Record<string, unknown>): Promise<T> =>
    new Promise((res, rej) => {
      axios
        .request({
          url: `https://api.vultr.com/v2/${path}`,
          method,
          headers: {
            Authorization: `Bearer ${get("api-key")}`,
          },
          data,
        })
        .then(({ data }) => res(data))
        .catch((err) => {
          rej(
            err.response?.data
              ? new Error(JSON.stringify(err.response.data))
              : err
          );
        });
    });

export const createInstance = api<Vultr.Instance>("post", "instances");

export const getInstance = (id: string) =>
  api<Vultr.Instance>("get", `instances/${id}`);

export const createDomain = api<Vultr.Domain>("post", "domains");

export const createRecord = (domain: string) =>
  api<Vultr.Record>("post", `domains/${domain}/records`);

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

export const getIPAddress = async (
  instanceId: string,
  { delay = 5_000, maxAttempts = 30 } = {}
) => {
  let _ip: string | undefined;
  for (let i = maxAttempts; i > 0; i--) {
    _ip = await getInstanceIPAddress(instanceId);
    if (_ip) break;
    await sleep(delay);
  }
  if (!_ip) throw new Error("unable to get IP Address");

  return _ip;
};

export const confirmInstanceIsReady = async (
  id: string,
  { delay = 15_000, maxAttempts = 60 } = {}
) => {
  let matched = false;
  for (let i = maxAttempts; i > 0; i--) {
    const { instance } = await getInstance(id)();
    if (
      instance.power_status === "running" &&
      instance.server_status === "ok" &&
      instance.status === "active"
    ) {
      matched = true;
      break;
    }
    await sleep(delay);
  }
  if (!matched) throw new Error("instance ready timeout");
};
