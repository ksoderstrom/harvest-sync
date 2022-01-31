// import Harvest from 'node-harvest-api';
import config from "./config.js";
import chalk from "chalk";
import Promise from "bluebird";
import Spinners from "spinnies";
import Harvest from "harvest-v2";
import _ from "lodash";
const buildPermalink = (company, timeEntry) => {
  return `${company.base_uri}/time/day/${timeEntry.date.replace(/-/g, "/")}`;
};

const source = new Harvest({
  account_ID: config.sourceAccountId,
  access_token: config.sourceToken,
  user_agent: config.appName,
});
const target = new Harvest({
  account_ID: config.targetAccountId,
  access_token: config.targetToken,
  user_agent: config.appName,
});

const sourceCompany = await source.company.retrieve();

const sourceMe = await source.users.retrieve("me");

const fromDate = new Date(new Date() - 30 * 24 * 60 * 60 * 1000);

const entries = await source.timeEntries.listBy({
  is_running: false,
  from: fromDate.toISOString().split("T")[0], // 30 days back
});

const mappedEntries = Object.entries(
  _.groupBy(entries.time_entries, "spent_date")
).map(([date, entries]) => ({
  date: date,
  entries: entries,
  id: `${sourceMe.id}-${date}`,
  hours: entries.reduce((totalHours, entry) => {
    return totalHours + entry.hours;
  }, 0),
}));

const spinnies = new Spinners();

Promise.map(
  mappedEntries,
  async (entry) => {
    spinnies.add(`entry_${entry.id}`, {
      text: chalk`Syncing time for {keyword("chocolate") ${entry.date}} {gray (${entry.hours} hours)}`,
    });

    const syncedEntries = await target.timeEntries.listBy({
      external_reference_id: entry.id,
      from: fromDate.toISOString().split("T")[0], // 30 days back
    });

    let res;
    if (syncedEntries && syncedEntries.time_entries.length > 0) {
      const syncedEntry = syncedEntries.time_entries[0];

      if (syncedEntry.hours === entry.hours) {
        spinnies.succeed(`entry_${entry.id}`, {
          text: chalk`Syncing time for {keyword("chocolate") ${entry.date}} {gray (${entry.hours} hours)} no change`,
        });
        return;
      } else {
        res = await target.timeEntries.update(syncedEntry.id, {
          hours: entry.hours,
        });
        spinnies.succeed(`entry_${entry.id}`, {
          text: chalk`Syncing time for {keyword("chocolate") ${entry.date}} {gray (${entry.hours} hours)} updated from ${syncedEntry.hours} hours`,
        });
        return;
      }
    } else {
      res = await target.timeEntries.create({
        project_id: config.targetProjectId,
        task_id: config.targetTaskId,
        spent_date: entry.date,
        hours: entry.hours,
        notes: `Synced from ${sourceCompany.name}'s Harvest`,
        external_reference: {
          id: entry.id,
          permalink: buildPermalink(sourceCompany, entry),
        },
      });
    }
    if (res.message) {
      spinnies.fail(`entry_${entry.id}`, {
        text: chalk`{redBright ${res.message}}`,
      });
    } else {
      spinnies.succeed(`entry_${entry.id}`);
    }
  },
  { concurrency: 10 }
);
