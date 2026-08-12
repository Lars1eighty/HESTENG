using HESTENG.Web.Models;

namespace HESTENG.Web.Services;

public class CompetitionStageService
{
    private readonly ActivityStore _activityStore;

    public CompetitionStageService(ActivityStore activityStore)
    {
        _activityStore = activityStore;
    }

    public CompetitionStage? GetStage(
        Guid activityId,
        Guid roundId,
        Guid stageId)
    {
        var activity = _activityStore.Get(activityId);

        return activity?.Rounds
            .FirstOrDefault(x => x.Id == roundId)?
            .Stages
            .FirstOrDefault(x => x.Id == stageId);
    }

    public void SyncPools(
        CompetitionStage stage,
        PoolPlan poolPlan)
    {
        if (stage.Type != CompetitionStageType.Pools)
        {
            throw new InvalidOperationException(
                "Konkurrencedelen er ikke et puljespil.");
        }

        stage.Data.Pools.Clear();

        foreach (var pool in poolPlan.Pools)
        {
            var competitionPool = new CompetitionPool
            {
                Name = pool.Name,
                ParticipantIds = pool.Participants
                    .Select(x => x.Id)
                    .ToList()
            };

            foreach (var match in pool.Matches)
            {
                competitionPool.Matches.Add(
                    new CompetitionMatch
                    {
                        Player1Id = match.Player1Id,
                        Player2Id = match.Player2Id,
                        WinnerId = match.WinnerId,

                        Player1Score =
                            match.Status == MatchStatus.Completed
                                ? match.Player1Score
                                : null,

                        Player2Score =
                            match.Status == MatchStatus.Completed
                                ? match.Player2Score
                                : null,

                        Status = match.Status switch
                        {
                            MatchStatus.NotPlayed =>
                                CompetitionMatchStatus.NotPlayed,

                            MatchStatus.Completed =>
                                CompetitionMatchStatus.Completed,

                            _ =>
                                CompetitionMatchStatus.NotPlayed
                        }
                    });
            }

            stage.Data.Pools.Add(competitionPool);
        }
    }

    public void SyncStandings(
        CompetitionStage stage,
        PoolPlan poolPlan,
        PoolPlanner poolPlanner)
    {
        if (stage.Type != CompetitionStageType.Pools)
        {
            throw new InvalidOperationException(
                "Konkurrencedelen er ikke et puljespil.");
        }

        for (var i = 0; i < poolPlan.Pools.Count; i++)
        {
            var sourcePool = poolPlan.Pools[i];

            if (i >= stage.Data.Pools.Count)
            {
                continue;
            }

            var competitionPool = stage.Data.Pools[i];

            var standings =
                poolPlanner.CalculateStandings(sourcePool);

            competitionPool.Standings = standings
                .Select(x => new CompetitionStanding
                {
                    ParticipantId = x.ParticipantId,
                    Position = x.Position,
                    Played = x.Played,
                    Wins = x.Wins,
                    Losses = x.Losses,
                    Points = x.Points
                })
                .ToList();
        }
    }

    public void SyncMatchResult(
        CompetitionStage stage,
        PoolMatch match)
    {
        if (stage.Type != CompetitionStageType.Pools)
        {
            throw new InvalidOperationException(
                "Konkurrencedelen er ikke et puljespil.");
        }

        foreach (var pool in stage.Data.Pools)
        {
            var competitionMatch = pool.Matches.FirstOrDefault(x =>
                x.Player1Id == match.Player1Id &&
                x.Player2Id == match.Player2Id);

            if (competitionMatch is null)
            {
                competitionMatch = pool.Matches.FirstOrDefault(x =>
                    x.Player1Id == match.Player2Id &&
                    x.Player2Id == match.Player1Id);
            }

            if (competitionMatch is null)
            {
                continue;
            }

            competitionMatch.Player1Id = match.Player1Id;
            competitionMatch.Player2Id = match.Player2Id;
            competitionMatch.Player1Score = match.Player1Score;
            competitionMatch.Player2Score = match.Player2Score;
            competitionMatch.WinnerId = match.WinnerId;

            competitionMatch.Status = match.Status switch
            {
                MatchStatus.NotPlayed =>
                    CompetitionMatchStatus.NotPlayed,

                MatchStatus.Completed =>
                    CompetitionMatchStatus.Completed,

                _ =>
                    CompetitionMatchStatus.NotPlayed
            };

            return;
        }
    }

    public KnockoutRound AddKnockoutRound(
        CompetitionStage stage,
        string name)
    {
        if (stage.Type != CompetitionStageType.Knockout)
        {
            throw new InvalidOperationException(
                "Konkurrencedelen er ikke knockout.");
        }

        stage.Data.Knockout ??= new KnockoutBracket();

        var round = new KnockoutRound
        {
            Name = name.Trim(),
            Number = stage.Data.Knockout.Rounds.Count + 1
        };

        stage.Data.Knockout.Rounds.Add(round);

        return round;
    }

    public CompetitionMatch AddKnockoutMatch(
        CompetitionStage stage,
        int roundNumber)
    {
        if (stage.Type != CompetitionStageType.Knockout)
        {
            throw new InvalidOperationException(
                "Konkurrencedelen er ikke knockout.");
        }

        var bracket = stage.Data.Knockout
            ?? throw new InvalidOperationException(
                "Knockout-strukturen er ikke oprettet.");

        var round = bracket.Rounds
            .FirstOrDefault(x => x.Number == roundNumber)
            ?? throw new InvalidOperationException(
                "Knockout-runden blev ikke fundet.");

        var match = new CompetitionMatch();

        round.Matches.Add(match);

        return match;
    }

    public void SetKnockoutParticipants(
        CompetitionStage stage,
        int roundNumber,
        Guid matchId,
        Guid? player1Id,
        Guid? player2Id)
    {
        if (stage.Type != CompetitionStageType.Knockout)
        {
            throw new InvalidOperationException(
                "Konkurrencedelen er ikke knockout.");
        }

        var bracket = stage.Data.Knockout
            ?? throw new InvalidOperationException(
                "Knockout-strukturen er ikke oprettet.");

        var round = bracket.Rounds
            .FirstOrDefault(x => x.Number == roundNumber)
            ?? throw new InvalidOperationException(
                "Knockout-runden blev ikke fundet.");

        var match = round.Matches
            .FirstOrDefault(x => x.Id == matchId)
            ?? throw new InvalidOperationException(
                "Knockout-kampen blev ikke fundet.");

        match.Player1Id = player1Id;
        match.Player2Id = player2Id;
    }

    public void SetKnockoutParticipantsBySeed(
        CompetitionStage stage,
        int roundNumber,
        Guid matchId,
        IReadOnlyList<Participant> participants,
        int player1Seed,
        int player2Seed)
    {
        if (stage.Type != CompetitionStageType.Knockout)
        {
            throw new InvalidOperationException(
                "Konkurrencedelen er ikke knockout.");
        }

        var player1 = participants
            .FirstOrDefault(x => x.Seed == player1Seed);

        var player2 = participants
            .FirstOrDefault(x => x.Seed == player2Seed);

        if (player1 is null)
        {
            throw new InvalidOperationException(
                $"Seed #{player1Seed} blev ikke fundet.");
        }

        if (player2 is null)
        {
            throw new InvalidOperationException(
                $"Seed #{player2Seed} blev ikke fundet.");
        }

        SetKnockoutParticipants(
            stage,
            roundNumber,
            matchId,
            player1.Id,
            player2.Id);
    }

    public void SetKnockoutParticipantFromStanding(
        CompetitionStage poolStage,
        CompetitionStage knockoutStage,
        int poolIndex,
        int position,
        int roundNumber,
        Guid matchId,
        bool player1)
    {
        if (poolStage.Type != CompetitionStageType.Pools)
        {
            throw new InvalidOperationException(
                "Kildekonkurrencedelen er ikke et puljespil.");
        }

        if (knockoutStage.Type != CompetitionStageType.Knockout)
        {
            throw new InvalidOperationException(
                "Målkonkurrencedelen er ikke knockout.");
        }

        if (poolIndex < 0 ||
            poolIndex >= poolStage.Data.Pools.Count)
        {
            throw new InvalidOperationException(
                "Puljen blev ikke fundet.");
        }

        if (position <= 0)
        {
            throw new InvalidOperationException(
                "Placeringen skal være større end 0.");
        }

        var pool = poolStage.Data.Pools[poolIndex];

        var standing = pool.Standings
            .FirstOrDefault(x => x.Position == position);

        if (standing is null)
        {
            throw new InvalidOperationException(
                $"Placering #{position} blev ikke fundet i puljen.");
        }

        var bracket = knockoutStage.Data.Knockout
            ?? throw new InvalidOperationException(
                "Knockout-strukturen er ikke oprettet.");

        var round = bracket.Rounds
            .FirstOrDefault(x => x.Number == roundNumber)
            ?? throw new InvalidOperationException(
                "Knockout-runden blev ikke fundet.");

        var match = round.Matches
            .FirstOrDefault(x => x.Id == matchId)
            ?? throw new InvalidOperationException(
                "Knockout-kampen blev ikke fundet.");

        if (player1)
        {
            match.Player1Id = standing.ParticipantId;
        }
        else
        {
            match.Player2Id = standing.ParticipantId;
        }
    }
}