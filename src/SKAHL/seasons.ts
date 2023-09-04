import { get } from '../interfaces/network';
import { SKAHLTeamInSeason } from './team';

type ServerTeamInfo = {
    name: string;
    divisionName: string;
    teamId: string;
    seasonId: string;
}
export class SKAHLSeason {
    public name: string;
    public id: number;

    constructor(name: string, id: number) {
        this.name = name;
        this.id = id;
    }

    toString(): string {
        return `SEASON: ${this.name}`;
    }

    private async getTeamsFromServer(): Promise<ServerTeamInfo[]> {
        return await ((await get(`http://snokinghockeyleague.com/api/team/list/${this.id}/0?v=1021270`)) as Promise<
            ServerTeamInfo[]
        >);
    }

    async getTeams(): Promise<SKAHLTeamInSeason[]> {
        return (await this.getTeamsFromServer()).map((ti) => new SKAHLTeamInSeason(this, ti.name, ti.teamId));
    }
}

async function getAllSKAHLSeasons(): Promise<SKAHLSeason[]> {
    const ans = (
        (await get('https://snokinghockeyleague.com/api/season/all/0?v=1021270')) as {
            seasons: [
                {
                    name: string;
                    id: number;
                },
            ];
        }
    ).seasons.map((s) => new SKAHLSeason(s.name, s.id));
    return ans;
}

export async function getCurrentSeasons(): Promise<SKAHLSeason[]> {
    const currentYear = new Date().getFullYear().toString();
    const allSeasons = await getAllSKAHLSeasons();
    return allSeasons.filter((s) => s.name.includes(currentYear));
}
