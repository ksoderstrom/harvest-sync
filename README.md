# harvest-sync

Sync (one-way) time entries from one [Harvest](https://www.getharvest.com) to
another. Only one project will be sync, and all entries will be created using
the same task. If an entry has already been synced, it will be updated with
the new time.

Only the last 30 days will be synced.

## Getting started

1) [Generate a personal access token](https://id.getharvest.com/developers) for
the source account and one for the target account.

2) Create a `config.js` based on the provided sample, and update the
`sourceAccountId` and `sourceToken` based on the source account. The
`sourceProjectId` should be the Harvest project to sync.

3) Update the `targetAccountId` and the `targetToken` based on the target
account. The `targetProjectId` and `targetTaskId` should be the Harvest
project and task the created time entries should use.

4) Run `yarn start` to sync the last 30 days.