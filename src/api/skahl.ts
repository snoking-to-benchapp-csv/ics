
import { TeamInfo } from "../currentTeams";
import { get } from "../interfaces/network";
import { SnokingSeasonResponse } from "../typings/snokingData";
import * as ics from 'ics';

export class SKAHLInfo {
     static async getAllSeasons(): Promise<Array<{ name: string; id: number }>> {
        const ans = (
            (await get(`https://snokinghockeyleague.com/api/season/all/0?v=1021270`)) as {
                seasons: [
                    {
                        name: string;
                        id: number;
                    }
                ];
            }
        ).seasons.map((x: { name: string; id: number }) => ({
            name: x.name,
            id: x.id,
        }));
        
        return ans;
    }

    static async getTeamsForSeason({ name, id }: { name: string; id: number }): Promise<TeamInfo> {
        return (
            (await get(`http://snokinghockeyleague.com/api/team/list/${id}/0?v=1021270`)) as [
                {
                    name: string;
                    divisionName: string;
                    teamId: string;
                    seasonId: string;
                }
            ]
        ).map((x) => ({
            name: `5v5: ${x.name} (${x.divisionName} - ${name})`,
            teamId: x.teamId,
            snokingUrl: `https://snokinghockeyleague.com/api/game/list/${x.seasonId}/0/${x.teamId}`,
            isSnoking: true,
        }));
    }

    static async getAllCurrentTeams(): Promise<TeamInfo> {
        const currentYear = new Date().getFullYear().toString();
        const allSeasons = await SKAHLInfo.getAllSeasons();

        let allTeams: TeamInfo = [];
        for(var i = 0; i < allSeasons.length; i++){
            const {name, id} = allSeasons[i];
            if(name.indexOf(currentYear) >= 0) {
                allTeams = allTeams.concat(await SKAHLInfo.getTeamsForSeason({name, id}));
            }
        }

        return allTeams;
    }

    static async getSnokingSeasonData(url: string): Promise<SnokingSeasonResponse> {
        return (await get(url)) as SnokingSeasonResponse;
    }

    static async getICSForSeason(url: string): Promise<string>{
        const seasonData = await this.getSnokingSeasonData(url);
        const {error, value} = ics.createEvents(seasonData.map(event => {

            const start = event.dateTime.split(/(?:-|T|:)/).splice(0,5) as any;
            return {
                title: `"'${event.teamAwayName}' vs '${event.teamHomeName}'"`,
                start: start,
                duration: { hours: 1, minutes: 0 },
            }
        }))
        return value || '';
    }
    
}
