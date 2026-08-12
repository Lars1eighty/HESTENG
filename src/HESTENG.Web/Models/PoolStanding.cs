namespace HESTENG.Web.Models;

public class PoolStanding
{
    public Guid ParticipantId { get; set; }

    public string Name { get; set; } = string.Empty;

    public int Played { get; set; }

    public int Wins { get; set; }

    public int Losses { get; set; }

    public int Points { get; set; }

    public int Position { get; set; }
}