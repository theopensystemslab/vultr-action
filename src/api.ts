import type {
  Instance,
  InstanceListWrapper,
  Record,
  RecordListWrapper,
  Vultr,
} from "@vultr/vultr-node";

import { sleep } from "./common";

const PAGINATION_DEFAULT = 100;
const UNINITIALISED_IP_ADDRESS = "0.0.0.0";

const getRecords = async (
  vultr: Vultr,
  domain: string,
  cursor: string | undefined = undefined,
): Promise<RecordListWrapper> => {
  return await vultr.dns.listRecords({
    "dns-domain": domain,
    per_page: PAGINATION_DEFAULT,
    cursor: cursor,
  });
};

export const getAllRecords = async (
  vultr: Vultr,
  domain: string,
): Promise<Record[]> => {
  let allRecords = [];
  let cursor = undefined;
  while (true) {
    const { records, meta } = await getRecords(vultr, domain, cursor);
    allRecords.push(...records);
    cursor = meta.links?.next;
    if (!cursor) break;
    console.log(
      `📜 pagination: collected ${allRecords.length} items - requesting next ${PAGINATION_DEFAULT}`,
    );
  }
  console.log(`👀 found ${allRecords.length} records on domain ${domain}`);
  return allRecords;
};

const getInstances = async (
  vultr: Vultr,
  region: string,
  cursor: string | undefined = undefined,
): Promise<InstanceListWrapper> => {
  return await vultr.instances.listInstances({
    region: region,
    per_page: String(PAGINATION_DEFAULT),
    cursor: cursor,
  });
};

export const getAllInstances = async (
  vultr: Vultr,
  region: string,
): Promise<Instance[]> => {
  let allInstances = [];
  let cursor = undefined;
  while (true) {
    const { instances, meta } = await getInstances(vultr, region, cursor);
    allInstances.push(...instances);
    cursor = meta.links?.next;
    if (!cursor) break;
    console.log(
      `📜 pagination: collected ${allInstances.length} items - requesting next ${PAGINATION_DEFAULT}`,
    );
  }
  console.log(`👀 found ${allInstances.length} instances in region ${region}`);
  return allInstances;
};

export const createDnsRecord = async (
  vultr: Vultr,
  domain: string,
  id: string,
  type: "A" | "CNAME",
  instanceIp: string,
): Promise<Record> => {
  const name = type == "A" ? id : `*.${id}`;
  const data = type == "A" ? instanceIp : `${id}.${domain}`;
  const res = await vultr.dns.createRecord({
    "dns-domain": domain,
    name: name,
    type: type,
    data: data,
  });
  // vultr-node doesn't necessarily throw a proper error if record creation fails
  if (!res?.record)
    throw new Error(`failed to create ${type} record at domain ${domain}`);
  return res.record;
};

export const destroyDnsRecord = async (
  vultr: Vultr,
  domain: string,
  id: string,
): Promise<void> => {
  return await vultr.dns.deleteRecord({
    "dns-domain": domain,
    "record-id": id,
  });
};

export const createInstance = async (
  vultr: Vultr,
  region: string,
  plan: string,
  domain: string,
  id: string,
  osId: string,
  tag: string,
  sshKeyIds?: string[],
): Promise<Instance> => {
  const host = `${id}.${domain}`;
  const res = await vultr.instances.createInstance({
    region: region,
    plan: plan,
    os_id: osId,
    label: host,
    hostname: host,
    tags: [tag], // 'tag' is deprecated
    sshkey_id: sshKeyIds,
  });
  // vultr-node doesn't necessarily throw a proper error if instance creation fails
  if (!res?.instance)
    throw new Error(
      `failed to create instance at hostname ${host} with tag ${tag}`,
    );
  return res.instance;
};

export const destroyInstance = async (
  vultr: Vultr,
  instanceId: string,
): Promise<void> => {
  return await vultr.instances.deleteInstance({
    "instance-id": instanceId,
  });
};

const getInstanceIPAddress = async (
  vultr: Vultr,
  instanceId: string,
): Promise<string | undefined> => {
  try {
    const { instance } = await vultr.instances.getInstance({
      "instance-id": instanceId,
    });
    return instance?.main_ip && instance.main_ip !== UNINITIALISED_IP_ADDRESS
      ? instance.main_ip
      : undefined;
  } catch (err) {
    // do not raise in case of throttling or bad response
    console.log(`⚠️ error getting instance: ${err}`);
    return undefined;
  }
};

export const getIpAddress = async (
  vultr: Vultr,
  instanceId: string,
  delayMs: number = 3_000,
  maxAttempts: number = 30,
): Promise<string> => {
  let instanceIp;
  for (let i = maxAttempts; i > 0; i--) {
    instanceIp = await getInstanceIPAddress(vultr, instanceId);
    if (instanceIp) break;
    await sleep(delayMs);
  }
  if (!instanceIp)
    throw new Error(
      `unable to get IP address for instance ${instanceId} ` +
        `after ${maxAttempts} attempts`,
    );
  return instanceIp;
};

export const confirmInstanceIsReady = async (
  vultr: Vultr,
  instanceId: string,
  delayMs: number = 15_000,
  maxAttempts: number = 60,
): Promise<void> => {
  let instanceIsReady = false;
  for (let i = maxAttempts; i > 0; i--) {
    try {
      const { instance } = await vultr.instances.getInstance({
        "instance-id": instanceId,
      });
      if (
        instance.power_status === "running" &&
        instance.server_status === "ok" &&
        instance.status === "active"
      ) {
        instanceIsReady = true;
        break;
      }
    } catch (err) {
      console.log(`⚠️ error getting instance: ${err}`);
    }
    console.log(
      `⌛ instance not ready on attempt ${maxAttempts - i + 1} - sleeping for ${
        delayMs / 1000
      }s`,
    );
    await sleep(delayMs);
  }
  if (!instanceIsReady)
    throw new Error(
      `instance ${instanceId} timeout after ${maxAttempts} attempts`,
    );
};
