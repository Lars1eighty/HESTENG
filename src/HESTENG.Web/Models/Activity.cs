namespace HESTENG.Web.Models;

public class Activity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public ActivityStatus Status { get; set; } = ActivityStatus.Draft;

    public TournamentFormat Format { get; set; } = TournamentFormat.NotSelected;

    public List<Participant> Participants { get; set; } = new();

    public List<Round> Rounds { get; set; } = new();
}

public enum ActivityStatus
{
    Draft,
    Active,
    Completed
}

public enum TournamentFormat
{
    NotSelected,
    Pools,
    Knockout,
    PoolsAndKnockout
}