# vultr-action

This Github Action creates and destroys instances, and associated DNS records, on the Vultr cloud service.

## v2

The latest major version of this action uses a dedicated node client called [vultr-node](https://github.com/vultr/vultr-node) to interact with the Vultr API.

It includes a fix to the teardown of DNS records, which was previously unreliable.

There are some breaking changes in terms of the inputs required (e.g. improved naming consistency, operating system submitted by name rather than ID).

### operating systems

A constant defining the operating systems currently supported by this action can be found in `src/common.ts`. You can get a full list of Vultr OS options from the CLI with the command `vultr-cli os list`. Please open a PR if you want to use this action to spin up an OS not included there.

## Development

Install dependencies with `pnpm install`.

The action's source lives in `src/`, but GitHub runs the **bundled** output at `dist/index.js` — not the TypeScript source. Any change to `src/` (or to a dependency) only takes effect once the bundle is rebuilt.

## Publishing a release

This action is not published to npm. Consumers reference it directly by git tag (e.g. `theopensystemslab/vultr-action@v3.0`), so **publishing = tagging a commit and cutting a GitHub release**.

Note that all existing tags are pinned, exact versions (`v2.3`, `v2.3.1`, …) - there is no floating major tag (`v2`), so consumers must opt in to a new version by bumping the tag they reference. Nothing upgrades automatically.

1. Make your changes on a branch and rebuild the bundle:

   ```shell
   pnpm run build
   ```

2. Bump the `version` field in `package.json` to match the release you intend to cut.

3. Commit everything — including `dist/` — and merge to `main`.

4. Create the release from the GitHub web UI — this is the simplest route, as it creates the tag and the release together:
   - Go to the repo's [Releases page](https://github.com/theopensystemslab/vultr-action/releases) and click **Draft a new release**.
   - Under **Choose a tag**, type the new version (e.g. `v3.0`) and select **Create new tag on publish**, targeting `main`.
   - Give it a title (e.g. `v3.0`) and a short description of the change.
   - Click **Publish release**.

### Versioning

Use [semantic versioning](https://semver.org/). Bump the **major** version for anything that could break a consumer's pipeline — including the Node runtime version in `action.yml` (`using: "node24"`), since a consumer's runner may not support the new runtime.
