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
        const id = get("pullrequest-id");
        const fullDomain = [id, domain].join(".");
        log("creating instance");
        const {
          instance: { default_password, ...safeInstance },
        } = await createInstance({
          api_key: get("api-key"),
          hostname: fullDomain,
          label: fullDomain,
          os_id: get("os-id"),
          plan: get("plan"),
          region: get("region"),
          tag: get("tag"),
        });
        log({ safeInstance });
        const ip = await getIPAddress(safeInstance.id);
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
        setOutput("ip-address", ip);
        setOutput("instance", safeInstance);
        log("waiting for active status");
        await confirmInstanceIsReady(safeInstance.id);
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
