import { setFailed, setOutput } from "@actions/core";
import {
  confirmInstanceIsReady,
  createInstance,
  createRecord,
  destroyInstance,
  destroyRecord,
  getIPAddress,
  listInstances,
  listRecords,
} from "./api";
import { get, log, sleep } from "./common";

const go = async (action: string) => {
  try {
    const id = get("pullrequest_id");
    const domain = get("domain");
    const fullDomain = [id, domain].join(".");

    switch (action) {
      case "create":
        // XXX: check if DNS or instances exist, exit gracefully if they do
        await Promise.all([
          (async () => {
            log("🔍 checking for existing DNS");
            const { records } = await listRecords(domain, 500)();
            const existing = records.filter(
              ({ type, name }) =>
                (type === "CNAME" && name === `*.${id}`) ||
                (type === "A" && name === id)
            );
            if (existing.length > 0) {
              log("❌ DNS records already exist");
              log(existing);
              process.exit(0);
            } else {
              log("✅ no existing DNS records");
            }
          })(),
          (async () => {
            log("🔍 checking for existing instances");
            const { instances } = await listInstances(500)();
            const existing = instances.filter((i) => i.label === fullDomain);
            if (existing) {
              log("❌ instances already exist");
              log(existing);
              process.exit(0);
            } else {
              log("✅ no existing instances");
            }
          })(),
        ]);

        log("🏗️ creating instance");
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
        log("⌛ waiting for active status");
        await confirmInstanceIsReady(instance.id);
        // XXX: sometimes the server isn't immediately ready for an ssh session
        log(
          "✅ instance active... waiting another 20s to ensure it's accessible"
        );
        await sleep(20_000);
        return;

      case "destroy":
        log("🗑️ performing teardown");
        const { instances } = await listInstances(500)();
        const matchingInstances = instances.filter(
          ({ label }) => label === fullDomain
        );

        log(`🔍 found ${matchingInstances.length} instances...`);
        let count = 0;
        // XXX: 'for of' so that await works
        for (const instance of matchingInstances) {
          try {
            log(
              `removing instance ${count++}/${matchingInstances.length} (${
                instance.id
              })`
            );
            await destroyInstance(instance.id)();
            log("🔥 removed instance");
          } catch (err) {
            log(`⚠️ unable to remove ${JSON.stringify(instance)}`);
          }
        }

        const { records: allRecords } = await listRecords(domain, 500)();

        const recordsToDelete = allRecords.filter((r) =>
          r.name.endsWith(fullDomain)
        );

        log(`🔍 found ${recordsToDelete.length} DNS records...`);

        for (const record of recordsToDelete) {
          try {
            await destroyRecord(domain, record.id);
            log(`🔥 removed ${record.name}`);
          } catch (err) {
            log(`⚠️ unable to remove ${record.name}`);
          }
        }

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
