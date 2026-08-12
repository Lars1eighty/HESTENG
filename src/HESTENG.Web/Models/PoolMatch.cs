namespace HESTENG.Web.Models;

public class PoolMatch
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid Player1Id { get; set; }

    public Guid Player2Id { get; set; }

    public MatchStatus Status { get; set; } = MatchStatus.NotPlayed;

    public int? Player1Score { get; set; }

    public int? Player2Score { get; set; }

    public Guid? WinnerId { get; set; }
}

public enum MatchStatus
{
    NotPlayed,
    Completed
}