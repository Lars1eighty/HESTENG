namespace HESTENG.Web.Services;

using HESTENG.Web.Models;

public class PoolPlanner
{
    public PoolPlan Calculate(IReadOnlyList<Participant> participants)
    {
        if (participants.Count == 0)
        {
            return new PoolPlan([]);
        }

        var poolCount = CalculatePoolCount(participants.Count);

        var pools = Enumerable
            .Range(0, poolCount)
            .Select(index => new Pool
            {
                Name = $"Pulje {GetPoolName(index)}"
            })
            .ToList();

        var seededParticipants = participants
            .OrderBy(x => x.Seed <= 0 ? int.MaxValue : x.Seed)
            .ToList();

        for (var i = 0; i < seededParticipants.Count; i++)
        {
            var round = i / poolCount;
            var position = i % poolCount;

            if (round % 2 == 1)
            {
                position = poolCount - 1 - position;
            }

            pools[position].Participants.Add(seededParticipants[i]);
        }

        foreach (var pool in pools)
        {
            pool.Matches = CreateMatches(pool.Participants);
        }

        return new PoolPlan(pools);
    }

    public List<PoolStanding> CalculateStandings(Pool pool)
    {
        var standings = pool.Participants
            .Select(participant => new PoolStanding
            {
                ParticipantId = participant.Id,
                Name = participant.Name
            })
            .ToList();

        foreach (var match in pool.Matches
            .Where(x => x.Status == MatchStatus.Completed))
        {
            var player1 = standings.First(x =>
                x.ParticipantId == match.Player1Id);

            var player2 = standings.First(x =>
                x.ParticipantId == match.Player2Id);

            player1.Played++;
            player2.Played++;

            if (match.WinnerId == match.Player1Id)
            {
                player1.Wins++;
                player2.Losses++;
            }
            else if (match.WinnerId == match.Player2Id)
            {
                player2.Wins++;
                player1.Losses++;
            }
        }

        foreach (var standing in standings)
        {
            standing.Points = standing.Wins;
        }

        var ordered = standings
            .OrderByDescending(x => x.Points)
            .ThenByDescending(x => x.Wins)
            .ThenBy(x => x.Name)
            .ToList();

        for (var i = 0; i < ordered.Count; i++)
        {
            ordered[i].Position = i + 1;
        }

        return ordered;
    }

    private static List<PoolMatch> CreateMatches(
        IReadOnlyList<Participant> participants)
    {
        var matches = new List<PoolMatch>();

        for (var i = 0; i < participants.Count; i++)
        {
            for (var j = i + 1; j < participants.Count; j++)
            {
                matches.Add(new PoolMatch
                {
                    Player1Id = participants[i].Id,
                    Player2Id = participants[j].Id
                });
            }
        }

        return matches;
    }

    private static int CalculatePoolCount(int participantCount)
    {
        if (participantCount <= 4)
        {
            return 1;
        }

        return (int)Math.Ceiling(participantCount / 4.0);
    }

    private static string GetPoolName(int index)
    {
        var name = string.Empty;
        var value = index;

        do
        {
            name = (char)('A' + value % 26) + name;
            value = value / 26 - 1;
        }
        while (value >= 0);

        return name;
    }
}

public class Pool
{
    public string Name { get; set; } = string.Empty;

    public List<Participant> Participants { get; set; } = new();

    public List<PoolMatch> Matches { get; set; } = new();
}

public class PoolPlan
{
    public PoolPlan(List<Pool> pools)
    {
        Pools = pools;
    }

    public IReadOnlyList<Pool> Pools { get; }
}