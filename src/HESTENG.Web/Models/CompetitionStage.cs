namespace HESTENG.Web.Models;

public class CompetitionStage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    public CompetitionStageType Type { get; set; }

    public int Order { get; set; }

    public CompetitionStageData Data { get; set; } = new();
}

public enum CompetitionStageType
{
    Pools,
    Knockout
}