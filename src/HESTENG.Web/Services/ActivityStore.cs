using HESTENG.Web.Models;

namespace HESTENG.Web.Services;

public class ActivityStore
{
    private readonly List<Activity> _activities = new();

    public IReadOnlyList<Activity> Activities => _activities;

    public Activity Add(string name)
    {
        var activity = new Activity
        {
            Name = name.Trim()
        };

        _activities.Add(activity);

        return activity;
    }

    public Activity? Get(Guid id)
    {
        return _activities.FirstOrDefault(x => x.Id == id);
    }

    public void Delete(Guid id)
    {
        var activity = Get(id);

        if (activity is not null)
        {
            _activities.Remove(activity);
        }
    }

    public Round AddRound(Guid activityId, string name)
    {
        var activity = Get(activityId)
            ?? throw new InvalidOperationException(
                "Aktivitet ikke fundet.");

        var round = new Round
        {
            Name = name,
            Number = activity.Rounds.Count + 1
        };

        activity.Rounds.Add(round);

        return round;
    }

    public CompetitionStage AddStage(
        Guid activityId,
        Guid roundId,
        string name,
        CompetitionStageType type)
    {
        var activity = Get(activityId)
            ?? throw new InvalidOperationException(
                "Aktivitet ikke fundet.");

        var round = activity.Rounds
            .FirstOrDefault(x => x.Id == roundId)
            ?? throw new InvalidOperationException(
                "Runde ikke fundet.");

        var stage = new CompetitionStage
        {
            Name = name.Trim(),
            Type = type,
            Order = round.Stages.Count + 1
        };

        round.Stages.Add(stage);

        return stage;
    }
}