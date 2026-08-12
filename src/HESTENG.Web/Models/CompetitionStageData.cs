namespace HESTENG.Web.Models;

public class CompetitionStageData
{
    public List<CompetitionPool> Pools { get; set; } = new();

    public KnockoutBracket? Knockout { get; set; }
}

public class CompetitionPool
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    public List<Guid> ParticipantIds { get; set; } = new();

    public List<CompetitionMatch> Matches { get; set; } = new();

    public List<CompetitionStanding> Standings { get; set; } = new();
}

public class KnockoutBracket
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public List<KnockoutRound> Rounds { get; set; } = new();
}

public class KnockoutRound
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    public int Number { get; set; }

    public List<CompetitionMatch> Matches { get; set; } = new();
}

public class CompetitionMatch
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? Player1Id { get; set; }

    public Guid? Player2Id { get; set; }

    public Guid? WinnerId { get; set; }

    public int? Player1Score { get; set; }

    public int? Player2Score { get; set; }

    public CompetitionMatchStatus Status { get; set; } =
        CompetitionMatchStatus.NotPlayed;
}

public class CompetitionStanding
{
    public Guid ParticipantId { get; set; }

    public int Position { get; set; }

    public int Played { get; set; }

    public int Wins { get; set; }

    public int Losses { get; set; }

    public int Points { get; set; }
}

public enum CompetitionMatchStatus
{
    NotPlayed,
    Active,
    Completed
}