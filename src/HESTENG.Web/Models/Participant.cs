namespace HESTENG.Web.Models;

public class Participant
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    public int Seed { get; set; }
}