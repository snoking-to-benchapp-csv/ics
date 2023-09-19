import fs from 'fs';
import Handlebars from 'handlebars';
import { SKHALTeamForMultipleSeasons } from '../SKAHL/team';
import path from 'path';

function relativeLocation(location: string): string {
    return path.join(__dirname, location);
}

function render(filename: string, data: unknown) {
    const source = fs.readFileSync(filename, 'utf8').toString();
    const template = Handlebars.compile(source);
    const output = template(data);
    return output;
}

export function createInformationPage(teams: SKHALTeamForMultipleSeasons[]) {
    const result = render(relativeLocation('./template.html'), { teams });
    fs.writeFileSync(relativeLocation('../../output/index.html'), result);

    fs.copyFile(relativeLocation('./styles.css'), relativeLocation('../../output/styles.css'), () => {});
}
