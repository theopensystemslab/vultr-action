import { setFailed, setOutput } from "@actions/core";
import {
  confirmInstanceIsReady,
  createInstance,
  createRecord,
  getIPAddress,
} from "./api";
import { get, log } from "./common";

const go = async (action: string) => {
  try {
    switch (action) {
      case "create":
        const domain = get("domain");
        const id = get("pullrequest_id");
        const fullDomain = [id, domain].join(".");
        log("creating instance");
        const { instance } = await createInstance({
          api_key: get("api_key"),
          hostname: fullDomain,
          label: fullDomain,
          os_id: get("os_id"),
          plan: get("plan"),
          region: get("region"),
          tag: get("tag"),
        });
        log({ instance });
        const ip = await getIPAddress(instance.id);
        log({ ip });
        const records = await Promise.all([
          createRecord(`${domain}`)({
            name: id,
            type: "A",
            data: ip,
          }),
          createRecord(`${domain}`)({
            name: `*.${id}`,
            type: "CNAME",
            data: `${id}.${domain}`,
          }),
        ]);
        log({ records });
        setOutput("ip_address", ip);
        setOutput("default_password", instance.default_password);
        setOutput("instance", instance);
        log("waiting for active status");
        await confirmInstanceIsReady(instance.id);
        return;
      default:
        throw new Error(`action '${action}' not supported`);
    }
  } catch (err) {
    throw err;
  }
};

go(get("action"))
  .then(() => log("done"))
  .catch((err) => setFailed(err.message));
