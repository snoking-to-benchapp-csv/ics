import { getCurrentSeasons } from './SKAHL/seasons';

import * as fs from 'fs';

async function main(): Promise<void> {
    const seasons = await getCurrentSeasons();
    let teams = (await Promise.all(seasons.map(async (s) => await s.getTeams()))).flat();
    teams = teams.filter((t) => t.name.includes('Frost Giants'));
    await teams[0].writeICS();
}

if (fs.existsSync('output')) {
    fs.rmSync('output', { recursive: true, force: true });
}
fs.mkdirSync('output');

main().catch((e) => {
    throw e;
});
