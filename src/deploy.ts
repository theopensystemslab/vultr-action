import { createInstance, createRecord, getInstanceIPAddress } from "./api";
import { getEnv, sleep } from "./common";

export const createPullRequestBuild = async () => {
  const id = Number(getEnv("PULL_REQUEST_ID"));
  const props = getEnv("VULTR_INSTANCE_(.*)");

  try {
    console.info("creating instance");

    const { instance } = await createInstance({
      ...props,
      app_id: Number(props.app_id),
      hostname: `${id}.${props.domain}`,
      label: `${id}.${props.domain}`,
      user_data: Buffer.from(props.app_id).toString("base64"),
    });

    console.info(`creating subdomains (*.${id}.${props.domain})`);

    const ip = await getIPAddress(instance.id);

    const records = await Promise.all([
      createRecord(`${props.domain}`)({
        name: id,
        type: "A",
        data: ip,
      }),
      createRecord(`${props.domain}`)({
        name: `*.${id}`,
        type: "CNAME",
        data: `${id}.${props.domain}`,
      }),
    ]);

    console.log({ instance, records });
  } catch (err) {
    console.error(err);
  }
};

const getIPAddress = async (
  instanceId: string,
  { delay = 10_000, maxAttempts = 15 } = {}
) => {
  let _ip: string;
  for (let i = maxAttempts; i > 0; i--) {
    _ip = await getInstanceIPAddress(instanceId);
    if (_ip) break;
    await sleep(delay);
  }
  if (!_ip) throw "unable to get IP Address";

  return _ip;
};
