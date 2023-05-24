import { EventAttributes, createEvents } from "ics";
import { get } from "../interfaces/network";
import { SnokingGameResponse, SnokingSeasonResponse } from "../typings/snokingData";
import { SKAHLSeason } from "./seasons";
import * as fs from 'fs';

const RINK_NAME_TO_ADDRESS: { [id: string]: string | null } = {
    Renton: "12620 164th Ave SE, Renton, WA 98059",
    Kirkland: "14326 124th Ave NE, Kirkland, WA 98034",
    "Snoqualmie A": "35300 SE Douglas St, Snoqualmie, WA 98065",
    "Snoqualmie B": "35300 SE Douglas St, Snoqualmie, WA 98065",
    Snoqualmie: "35300 SE Douglas St, Snoqualmie, WA 98065", // It's called Snoqualmie B right now, but future proofing
    "Kent Valley Ice Centre": "6015 S 240th St, Kent, WA 98032",
    "accesso ShoWare Center": "625 W James St, Kent, WA 98032",
    "KCI Starbucks Rink": "10601 5th Ave NE, Seattle, WA 98125",
    "KCI Smartsheet Rink": "10601 5th Ave NE, Seattle, WA 98125",
    "KCI VMFH Rink": "10601 5th Ave NE, Seattle, WA 98125",
    "Olympic View Arena": "22202 70th Ave W, Mountlake Terrace, WA 98043",
    "Lynnwood Ice Center": "19803 68th Ave W, Lynnwood, WA 98036",
    "Everett Comm Ice Rink": "2000 Hewitt Ave, Everett, WA 98201",
    "Angel of the Winds Arena": "2000 Hewitt Ave, Everett, WA 98201",
};

export class SKAHLTeamInSeason{
    season: SKAHLSeason;
    name: string;
    teamId: string;

    constructor(
        season: SKAHLSeason,
        name: string,
        teamId: string
    ) {
        this.season = season;
        this.name = name;
        this.teamId = teamId;
    }

    toString() {
        return `TEAM: ${this.season.name} => ${this.name}`
    }

    async getGames(): Promise<SnokingGame[]> {
        return (await this.getServerInfo()).map(g => new SnokingGame(g, this))
    }

    async getICS(): Promise<string> {
        const {error, value} = createEvents((await this.getGames()).map(g => g.getICSEventInfo()));
        if(value) {
            return value;
        } else {
            console.log({error});
            throw error;
        }
    }

    async writeICS(): Promise<void> {
        const ics = await this.getICS();
        const seasonLocation = __dirname + `/../output/${this.season.name}/`
        if (!fs.existsSync(seasonLocation)){
            fs.mkdirSync(seasonLocation);
        }
        fs.writeFileSync(seasonLocation + `${this.name}.ics`, ics);
    }


    private async getServerInfo(): Promise<SnokingSeasonResponse> {
        return (await get(`https://snokinghockeyleague.com/api/game/list/${this.season.id}/0/${this.teamId}`)) as SnokingSeasonResponse
    }

}

class SnokingGame {
    event: SnokingGameResponse;
    team: SKAHLTeamInSeason;

    constructor(event: SnokingGameResponse, team: SKAHLTeamInSeason) {
        this.event = event;
        this.team = team;
    }

    isHome(): boolean {
        return this.team.teamId == `${this.event.teamHomeSeasonId}`;
    }

    getICSEventInfo(): EventAttributes {
        const start = this.event.dateTime.split(/(?:-|T|:)/).splice(0,5).map(i => parseInt(i, 10)) as any;
        const location1 = this.isHome() ? this.event.rinkName + " - Home" : this.event.rinkName + " - Away";
        const location2 = RINK_NAME_TO_ADDRESS[this.event.rinkName] || undefined;
        return {
            title: `${this.event.teamHomeName} vs ${this.event.teamAwayName}`,
            start: start,
            duration: { hours: 1, minutes: 0 },
            location: location1 + "\n" + location2,
            description: this.isHome() ? "Light Jerseys" : "Dark Jerseys",
        }
    }   
}