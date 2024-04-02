import { setFailed, setOutput } from "@actions/core";
import { performance } from 'perf_hooks'

import VultrNode from '@vultr/vultr-node'

import {
  confirmInstanceIsReady,
  createDnsRecord,
  createInstance,
  destroyDnsRecord,
  destroyInstance,
  getAllInstances,
  getAllRecords,
  getIpAddress,
} from './api'
import { getDurationSeconds, getVar, sleep } from './common'
import type { VultrOsIdMapping } from './vultr'

// define constants
const VULTR_OS_ID_BY_OS: VultrOsIdMapping = {
  // get full list of options by running `vultr-cli os list`
  alpine: '2076', // only one version available
  coreOs: '391', // stable
  flatcar: '2075', // LTS
  ubuntu: '1743', // 22.04 LTS
}
const DEFAULT_DOMAIN = "planx.pizza"
const DEFAULT_OS = "ubuntu"

// main should parse args from command line and create or destroy resources
const main = async (): Promise<number> => {

  console.log("🚀 running vultr script")
  console.log("🔑 initializing vultr client with API key from env")
  const vultr = VultrNode.initialize({
    apiKey: getVar("api_key"),
  })

  const action = getVar("action")
  const pullRequestId = getVar("pull_request_id")
  const domain = getVar("domain", DEFAULT_DOMAIN)
  const os = getVar("os", DEFAULT_OS)

  console.log(`
  🚀 running vultr script with following arguments parsed from command line:
      action=${action}
      domain=${domain}
      pullRequestId=${pullRequestId}
      os=${os}
  `)

  // in all cases we need to check for existence of resources first
  const [ existingRecordIds, existingInstanceIds ] = await Promise.all([
    checkIfDnsRecordsExist(vultr, domain, pullRequestId),
    checkIfInstanceExists(vultr, domain, pullRequestId),
  ])

  switch (action) {
    case 'create':
      if (existingRecordIds.length > 0 || existingInstanceIds.length > 0) {
        console.error("❌ resources already exist - not attempting to create")
        return 1
      }
      console.log("🏗️ creating resources")
      return await create(vultr, domain, pullRequestId, VULTR_OS_ID_BY_OS[os])
    case 'destroy':
      if (existingRecordIds.length == 0 || existingInstanceIds.length == 0) {
        console.error("❌ resources don't exist - not attempting to destroy")
        return 1
      }
      console.log("🗑️ performing teardown")
      return await destroy(vultr, domain, existingRecordIds, existingInstanceIds)
    default:
      console.error(`❌ invalid action: ${action} (must be 'create' or 'destroy')`)
      return 2
  }
}

const checkIfDnsRecordsExist = async (vultr: any, domain: string, id: string): Promise<string[]> => {
  console.log(`🔍 checking for existing DNS records for pull request ${id} on domain ${domain}`);
  const allRecords = await getAllRecords(vultr, domain)
  const existingRecords = allRecords.filter(
    ({ type, name }) =>
      (type === "CNAME" && name === `*.${id}`) ||
      (type === "A" && name === id)
  )
  // we don't handle any case where only 1 of 2 records has been created (this would require a manual fix)
  if (existingRecords.length > 0) {
    console.log(`✔ DNS records already exist`);
    console.log(existingRecords);
    return existingRecords.map((record) => record.id)
  }
  console.log("✘ no relevant DNS records exist");
  return []
}

const checkIfInstanceExists = async (vultr: any, domain: string, id: string): Promise<string[]> => {
  console.log(`🔍 checking for existing instance for pull request ${id} on domain ${domain}`);
  const allInstances = await getAllInstances(vultr)
  const existingInstances = allInstances.filter((instance) => instance.label === `${id}.${domain}`);
  if (existingInstances.length > 0) {
    console.log(`✔ instance already exists`);
    console.log(existingInstances);
    return existingInstances.map((instance) => instance.id)
  }
  console.log("✘ relevant instance does not exist");
  return []
}

const create = async (
  vultr: any,
  domain: string,
  id: string,
  osId: string,
): Promise<number> => {
  // keep time for logging purposes
  const t0 = performance.now()
  try {
    const instance = await createInstance(vultr, domain, id, osId)

    const instanceId = instance.id
    console.log(`🌐 instance created with ID: ${instanceId}`)
    
    // get IP when available
    const instanceIp = await getIpAddress(vultr, instanceId);
    console.log(`🌐 instance has been assigned IP: ${instanceIp}`);

    // make values available to github workflow
    setOutput("ip_address", instanceIp);
    setOutput("default_password", instance.default_password);
    setOutput("instance", instance);

    // create DNS records
    const [ dnsRecordA, dnsRecordCname ] = await Promise.all([
      createDnsRecord(vultr, domain, id, 'A', instanceIp),
      createDnsRecord(vultr, domain, id, 'CNAME', instanceIp),
    ])
    console.log(`🌐 A record created with ID: ${dnsRecordA.id}`);
    console.log(`🌐 CNAME record created with ID: ${dnsRecordCname.id}`);

    // wait for server to fully spin up
    await confirmInstanceIsReady(vultr, instanceId);
    // sometimes the server isn't immediately ready for an ssh session
    console.log("✅ instance active - waiting another 20s to ensure it's accessible");
    await sleep(20_000);
    console.log(`⌛ all resources created and made ready in ${getDurationSeconds(t0, performance.now())}s`)
    
  } catch (err) {
    console.error(`❌ error creating resources:\n${err}`)
    return 1
  }
  return 0
}

const destroy = async (
  vultr: any,
  domain: string,
  existingRecordIds: string[],
  existingInstanceIds: string[],
): Promise<number> => {
  try {
    // destroy DNS records
    await Promise.all(existingRecordIds.map((recordId) => destroyDnsRecord(vultr, domain, recordId)));
    console.log("🔥 DNS records destroyed")
    // destroy instance
    await Promise.all(existingInstanceIds.map((instanceId) => destroyInstance(vultr, instanceId)));
    console.log("🔥 DNS records destroyed")
  } catch (err) {
    console.error(`❌ error destroying resources:\n${err}`)
    return 1
  }
  return 0;
}

// run main function when script is executed
main().then((exitCode) => {
  switch (exitCode) {
  case 0:
    console.log("🎉 script completed successfully");
    break;
  case 1:
    setFailed("❌ script failed to create/destroy resources as expected");
    break;
  case 2:
    setFailed("❌ script failed due to usage error (e.g. invalid arguments)");
    break;
  }
}).catch((err) => {
  setFailed(`❌ script failed with unhandled error:\n${err}`)
})
