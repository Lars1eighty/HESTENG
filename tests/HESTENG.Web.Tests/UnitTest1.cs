using HESTENG.Web.Models;
using HESTENG.Web.Services;

namespace HESTENG.Web.Tests;

public class AdvancementRuleTests
{
    [Fact]
    public void ApplyAdvancementRule_TwoFromEachPool_AdvancesSixParticipants()
    {
        var poolStage = new CompetitionStage
        {
            Type = CompetitionStageType.Pools
        };

        poolStage.Data.Pools.Add(CreatePool(1, 2, 3));
        poolStage.Data.Pools.Add(CreatePool(4, 5, 6));
        poolStage.Data.Pools.Add(CreatePool(7, 8, 9));

        var knockoutStage = new CompetitionStage
        {
            Type = CompetitionStageType.Knockout
        };

        knockoutStage.Data.Knockout = new KnockoutBracket();

        knockoutStage.Data.Knockout.Rounds.Add(
            new KnockoutRound
            {
                Number = 1,
                Name = "Kvartfinaler"
            });

        var rule = new AdvancementRule
        {
            SourceType = AdvancementSourceType.Pool,
            Count = 2,
            DestinationType = AdvancementDestinationType.Knockout
        };

        var activityStore = new ActivityStore();
        var service = new CompetitionStageService(activityStore);

        var result = service.ApplyAdvancementRule(
            poolStage,
            knockoutStage,
            rule,
            1);

        Assert.Equal(6, result.Count);

        Assert.Equal(
            new[]
            {
                poolStage.Data.Pools[0].Standings[0].ParticipantId,
                poolStage.Data.Pools[0].Standings[1].ParticipantId,
                poolStage.Data.Pools[1].Standings[0].ParticipantId,
                poolStage.Data.Pools[1].Standings[1].ParticipantId,
                poolStage.Data.Pools[2].Standings[0].ParticipantId,
                poolStage.Data.Pools[2].Standings[1].ParticipantId
            },
            result);

        Assert.Equal(
            3,
            knockoutStage.Data.Knockout.Rounds[0].Matches.Count);
    }

    private static CompetitionPool CreatePool(
        params int[] positions)
    {
        var pool = new CompetitionPool();

        foreach (var position in positions)
        {
            pool.Standings.Add(
                new CompetitionStanding
                {
                    ParticipantId = Guid.NewGuid(),
                    Position = position
                });
        }

        return pool;
    }
}