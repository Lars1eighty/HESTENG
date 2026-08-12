namespace HESTENG.Web.Models;

public class AdvancementRule
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public AdvancementSourceType SourceType { get; set; }

    public int Count { get; set; }

    public AdvancementDestinationType DestinationType { get; set; }
}

public enum AdvancementSourceType
{
    Pool
}

public enum AdvancementDestinationType
{
    Knockout
}