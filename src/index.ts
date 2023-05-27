import { getCurrentSeasons } from "./SKAHL/seasons";

import * as fs from 'fs';

const main = async () => {
    let seasons = await getCurrentSeasons();
    let teams = (await Promise.all(seasons.map(s => s.getTeams()))).flat();
    teams = teams.filter(t => t.name.indexOf('Frost Giants') >= 0);
    console.log(await teams[0].writeICS());
}

if (fs.existsSync('output')){
    fs.rmSync('output', { recursive: true, force: true });

}
fs.mkdirSync('output');

main();