import Harvest from 'node-harvest-api';
import config from './config.js';

const buildPermalink = (company, timeEntry) => {
  return `${company.base_uri}/time/day/${timeEntry.spent_date.replace(/-/g, '/')}/${timeEntry.id}`;
}

const source = new Harvest(config.sourceAccountId, config.sourceToken, config.appName);
const target = new Harvest(config.targetAccountId, config.targetToken, config.appName);

const sourceCompany = await source.company();

const entries = await source.time_entries.get({
  is_running: false,
  project_id: config.sourceProjectId,
  from: (new Date(new Date() - 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // 30 days back
});

for (const entry of entries) {
  console.log(`Syncing time for ${entry.spent_date}: ${entry.hours} hours`)

  const syncedEntry = (await target.time_entries.get({
    external_reference_id: entry.id,
  }))[0];

  if (syncedEntry) {
    await target.time_entries.update(syncedEntry.id, {
      hours: entry.hours,
    });
  } else {
    await target.time_entries.create({
      project_id: config.targetProjectId,
      task_id: config.targetTaskId,
      spent_date: entry.spent_date,
      hours: entry.hours,
      notes: `Synced from ${sourceCompany.name}'s Harvest`,
      external_reference: {
        id: entry.id,
        permalink: buildPermalink(sourceCompany, entry),
      },
    });
  }
}
