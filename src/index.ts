import { setFailed, setOutput } from "@actions/core";
import {
  confirmInstanceIsReady,
  createInstance,
  createRecord,
  destroyDomain,
  destroyInstance,
  getIPAddress,
  listInstances,
} from "./api";
import { get, log, sleep } from "./common";

const go = async (action: string) => {
  try {
    const id = get("pullrequest_id");
    const domain = get("domain");
    const fullDomain = [id, domain].join(".");

    switch (action) {
      case "create":
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
        // XXX: sometimes the server isn't immediately ready for an ssh session
        log("instance active... waiting another 20s to ensure it's accessible");
        await sleep(20_000);
        return;

      case "destroy":
        log("performing teardown");
        const { instances } = await listInstances();
        const matchingInstances = instances.filter(
          ({ label }) => label === fullDomain
        );

        log(`found ${matchingInstances.length} servers`);
        let count = 0;
        // XXX: 'for of' so that await works
        for (const instance of matchingInstances) {
          try {
            log(
              `removing server ${count++}/${matchingInstances.length} (${
                instance.id
              })`
            );
            await destroyInstance(instance.id)();
            log("removed server");
          } catch (err) {}
        }

        log("removing DNS entries");

        log(`removing ${fullDomain} (A-record)`);
        await destroyDomain(fullDomain);
        log("removed");

        log(`removing *.${fullDomain} (CNAME wildcard)`);
        await destroyDomain(`*.${fullDomain}`);
        log("removed");
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
