import { type DateArray, type EventAttributes, createEvents } from 'ics';
import { get } from '../interfaces/network';
import { type SnokingGameResponse, type SnokingSeasonResponse } from '../typings/snokingData';
import { SeasonType, type SKAHLSeason } from './seasons';
import * as fs from 'fs';
import * as path from 'path';
import moment from 'moment-timezone';

const RINK_NAME_TO_ADDRESS: Record<string, string | null> = {
    Renton: '12620 164th Ave SE, Renton, WA 98059',
    Kirkland: '14326 124th Ave NE, Kirkland, WA 98034',
    'Snoqualmie A': '35300 SE Douglas St, Snoqualmie, WA 98065',
    'Snoqualmie B': '35300 SE Douglas St, Snoqualmie, WA 98065',
    Snoqualmie: '35300 SE Douglas St, Snoqualmie, WA 98065', // It's called Snoqualmie B right now, but future proofing
    'Kent Valley Ice Centre': '6015 S 240th St, Kent, WA 98032',
    'accesso ShoWare Center': '625 W James St, Kent, WA 98032',
    'KCI Starbucks Rink': '10601 5th Ave NE, Seattle, WA 98125',
    'KCI Smartsheet Rink': '10601 5th Ave NE, Seattle, WA 98125',
    'KCI VMFH Rink': '10601 5th Ave NE, Seattle, WA 98125',
    'Olympic View Arena': '22202 70th Ave W, Mountlake Terrace, WA 98043',
    'Lynnwood Ice Center': '19803 68th Ave W, Lynnwood, WA 98036',
    'Everett Comm Ice Rink': '2000 Hewitt Ave, Everett, WA 98201',
    'Angel of the Winds Arena': '2000 Hewitt Ave, Everett, WA 98201',
};

export class SKHALTeamForMultipleSeasons {
    teamInSeason: SKAHLTeamInSeason[] = [];
    name: string;
    teamId: string;

    constructor(name: string, teamId: string) {
        this.name = name;
        this.teamId = teamId;
    }

    public addSeason(season: SKAHLTeamInSeason): void {
        this.teamInSeason.push(season);
    }

    toString(): string {
        let ans = `TEAM: ${this.name}\n`;
        this.teamInSeason.forEach((s) => {
            ans += `\t${s.season.name} (${s.season.id})\n`;
        });
        return ans;
    }

    public async getGames(): Promise<SnokingGame[]> {
        const games = await Promise.all(this.teamInSeason.map((x) => x.getGames()));
        return games.flat().sort((a, b) => a.event.dateTime.localeCompare(b.event.dateTime));
    }

    public async getFutureGames(): Promise<SnokingGame[]> {
        return (await this.getGames()).filter((g) => {
            return (
                moment(g.event.dateTime) > moment().subtract(2, 'days')
            ); /* only games in the future with some fudge*/
        });
    }

    async getICS(): Promise<string> {
        // The goal here is to get the most recent season.
        // We do that by comparing the latest game in each season.
        // BenchApp does weird things when games are removed from the ICS, so just going to emit
        // an ICS with the whole season in it.

        // Eventually, I should change to having folders by season. TBD
        const gamesBySeason = (
            await Promise.all(
                this.teamInSeason.map(async (x) => ({
                    season: x,
                    games: (await x.getGames()).sort((a, b) =>
                        a.event.dateTime.toString().localeCompare(b.event.dateTime.toString()),
                    ),
                })),
            )
        ).sort((a, b) => b.games[0].event.dateTime.toString().localeCompare(a.games[0].event.dateTime.toString()));

        const { games, season } = gamesBySeason[0];
        console.log('MOST RECENT SEASON:');
        console.log({ games, season });

        const { error, value } = createEvents(gamesBySeason[0].games.map((g) => g.getICSEventInfo()));
        if (value !== null && value !== undefined) {
            return value;
        } else {
            throw error ?? new Error('Issue creating ICS');
        }
    }

    getFileDir(): string {
        return path.join(__dirname, `/../..//output/`);
    }

    getFileName(): string {
        return this.getFileDir() + `${this.name}.ics`;
    }

    async writeICS(): Promise<void> {
        const ics = await this.getICS();
        if (!fs.existsSync(this.getFileDir())) {
            fs.mkdirSync(this.getFileDir());
        }
        fs.writeFileSync(this.getFileName(), ics);
    }
}

export class SKAHLTeamInSeason {
    season: SKAHLSeason;
    name: string;
    teamId: string;

    constructor(season: SKAHLSeason, name: string, teamId: string) {
        this.season = season;
        this.name = name;
        this.teamId = teamId;
    }

    toString(): string {
        return `TEAM: ${this.season.name} => ${this.name}`;
    }

    async getGames(): Promise<SnokingGame[]> {
        return (await this.getServerInfo()).map((g) => new SnokingGame(g, this));
    }

    private async getServerInfo(): Promise<SnokingSeasonResponse> {
        const DOMAIN = {
            [SeasonType.SKAHL]: 'https://snokinghockeyleague.com',
            [SeasonType.POND]: 'http://snokingpondhockey.com',
        }[this.season.seasonType];
        return (await get(`${DOMAIN}/api/game/list/${this.season.id}/0/${this.teamId}`)) as SnokingSeasonResponse;
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
        return `${this.team.teamId}` === `${this.event.teamHomeSeasonId}`;
    }

    getICSEventInfo(): EventAttributes {
        const startTime = moment.tz(this.event.dateTime, 'America/Los_Angeles').utc();
        const start = [
            startTime.get('year'),
            startTime.get('month') + 1,
            startTime.get('date'),
            startTime.get('hour'),
            startTime.get('minute'),
        ] as DateArray;

        const location1 = this.isHome() ? this.event.rinkName + ' - Home' : this.event.rinkName + ' - Away';
        const location2 = RINK_NAME_TO_ADDRESS[this.event.rinkName] ?? '';

        return {
            title: `${this.event.teamHomeName} vs ${this.event.teamAwayName}`,
            start,
            startInputType: 'utc',
            duration: { hours: 1, minutes: 0 },
            location: `(${location1}) ${location2}`,
            description: this.isHome() ? 'Light Jerseys' : 'Dark Jerseys',
        };
    }
}
