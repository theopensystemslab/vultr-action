import { listRecords } from "./api";
async function go() {
  const { records } = await listRecords("goo.tools", 100)();
  console.log(records);
}

go();
