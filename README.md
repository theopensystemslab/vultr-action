# vultr-action

This Github Action creates and destroys instances, and associated DNS records, on the Vultr cloud service.

## v2

The latest major version of this action uses a dedicated node client called [vultr-node](https://github.com/vultr/vultr-node) to interact with the Vultr API.

It includes a fix to the teardown of DNS records, which was previously unreliable.

There are some breaking changes in terms of the inputs required (e.g. improved naming consistency, operating system submitted by name rather than ID).

### operating systems

A constant defining the operating systems currently supported by this action can be found in `src/common.ts`. You can get a full list of Vultr OS options from the CLI with the command `vultr-cli os list`. Please open a PR if you want to use this action to spin up an OS not included there.