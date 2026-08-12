namespace HESTENG.Web.Models;

public class Round
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    public int Number { get; set; }

    public RoundType Type { get; set; } = RoundType.Pools;

    public RoundStatus Status { get; set; } = RoundStatus.NotStarted;

    public List<CompetitionStage> Stages { get; set; } = new();
}

public enum RoundType
{
    Pools,
    Knockout
}

public enum RoundStatus
{
    NotStarted,
    Active,
    Completed
}