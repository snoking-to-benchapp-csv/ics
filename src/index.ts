import _ from 'lodash';
import { getCurrentSeasons } from './SKAHL/seasons';

import * as fs from 'fs';
import { SKHALTeamForMultipleSeasons } from './SKAHL/team';
import { createInformationPage } from './page/renderPage';

async function main(): Promise<void> {
    // Get all team data across all current seasons (I.E. seasons with the current calendar year in the title)
    const seasons = await getCurrentSeasons();
    let teams = (await Promise.all(seasons.map(async (s) => await s.getTeams()))).flat();

    // TEAM WHITELIST:
    // I'm still testing out this flow so I don't want to blow it open to everyone in the world right now.
    // This makes sure that we're only processing teams that agree to be living based on hackey-side project code
    // (I.E just my team right now lol)

    teams = teams.filter((t) => t.name.includes('Frost Giants'));

    const teamSeasonsByTeam = _.groupBy(teams, (t) => t.name);
    const allTeams: SKHALTeamForMultipleSeasons[] = [];
    Object.entries(teamSeasonsByTeam).forEach(([teamName, config]) => {
        const team = new SKHALTeamForMultipleSeasons(teamName, config[0].teamId);
        config.forEach((s) => team.addSeason(s));
        allTeams.push(team);
    });

    await Promise.all(allTeams.map((x) => x.writeICS()));
    createInformationPage(allTeams);
}

if (fs.existsSync('output')) {
    fs.rmSync('output', { recursive: true, force: true });
}
fs.mkdirSync('output');

main().catch((e) => {
    throw e;
});
