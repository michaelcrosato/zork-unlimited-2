import { describe, it, expect } from "vitest";
import { createInitialState } from "../src/core/state.js";
import { multiAgentStep } from "../src/core/sync.js";
import { ParserPack, ParserPackSchema } from "../src/parser/schema.js";
import { tickEconomy } from "../src/core/economy.js";

describe("Syndicate SWF Weather Forecast Oracle Manipulation Defenses (AF-215)", () => {
  const mockPack: ParserPack = ParserPackSchema.parse({
    meta: {
      id: "swf_oracle_defenses_pack",
      title: "Oracle Defenses Test Pack",
      start_room: "clearing",
      vars_init: { gold: 20000 },
      flags_init: [],
    },
    rooms: [
      {
        id: "clearing",
        name: "Forest Clearing",
        description: "A wide open clearing.",
        objects: [],
        npcs: [],
        exits: [],
      }
    ],
    objects: [],
    npcs: [],
  });

  it("should successfully authorize oracle, deduct stake, record forecast history, detect anomalies, handle successful disputes, slash stakes, and de-authorize malicious oracle", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 3000 },
      agentsInit: ["player", "alice", "bob", "charlie"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player", "alice"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "charlie"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    // 1. Propose Weather Forecast Oracle with custom stake
    let stepResult = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_WEATHER_FORECAST_ORACLE",
          proposalId: "oracle_prop_1",
          syndicateId: "alpha",
          oracleReputationThreshold: 60,
          forecastAccuracyFloor: 90,
          oracleStake: 800,
          timestamp: 1005,
        } as any,
      },
      mockPack
    );

    expect(stepResult.ok).toBe(true);
    state = stepResult.state;

    // 2. Vote to authorize by Alice (majority of alpha member votes)
    let stepResult2 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_WEATHER_FORECAST_ORACLE",
          syndicateId: "alpha",
          proposalId: "oracle_prop_1",
          vote: true,
          timestamp: 1020,
        } as any,
      },
      mockPack
    );

    expect(stepResult2.ok).toBe(true);
    state = stepResult2.state;

    // Verify State Updates upon resolution
    expect(state.sweepPoolWeatherForecastOracleAuthorized).toBe(true);
    expect(state.sweepPoolWeatherForecastOracleReputationThreshold).toBe(60);
    expect(state.sweepPoolWeatherForecastOracleAccuracyFloor).toBe(90);
    expect(state.sweepPoolWeatherForecastOracleStake).toBe(800);
    expect(state.sweepPoolWeatherForecastOracleProvider).toBe("alpha");
    expect(state.sweepPoolWeatherForecastOracleReputation).toBe(100);
    
    // Proposing syndicate's war chest should be slashed/deducted by the 800 gold stake (and 100 proposal fee, 28 Alice vote fee)
    expect(state.syndicates?.alpha.warChest).toBe(9072);

    // 3. Setup Volatility Hedging Policy to trigger forecasts in economy tick
    state.sweepPoolVolatilityHedgingPolicyAuthorized = true;
    state.sweepPoolVolatilityHedgingThreshold = 30;
    state.sweepPoolVolatilityHedgingRatio = 80;
    state.sweepPoolVolatilityHedgingReserveFloor = 100;
    state.swfStakingSweepPool = 1000;

    // Introduce weather forecast malicious override for step 5 (forecast made at step 0)
    state.weatherForecastOracleMaliciousOverride = {
      "5": 80, // False forecast volatility of 80
    };

    // Run economy tick at step 0 to schedule prediction
    state.environment = {
      weather: "storm",
      temperature: "cold",
      wind: "tempest",
      lastUpdatedStep: 0,
    };
    state.step = 0;

    state = tickEconomy(state, mockPack);

    // Verify the prediction was saved in history
    expect(state.weatherForecastHistory?.["5"]).toBe(80);

    // 4. Tick to step 5. Set actual step weather to "clear" / "calm" so actual volatility is very low
    state.step = 5;
    state.environment = {
      weather: "clear", // 5 vol
      temperature: "mild",
      wind: "calm", // 0 vol => total 5
      lastUpdatedStep: 5,
    };

    state = tickEconomy(state, mockPack);

    // Verify that the anomaly is recorded
    expect(state.weatherForecastAnomalies).toContain(5);
    expect(state.journal?.some(j => j.includes("[Oracle Anomaly Detected]"))).toBe(true);

    // 5. File a dispute by Beta syndicate (bob)
    // Bob has 10000 war chest. Filing dispute costs 200 gold dispute stake.
    let stepResult3 = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "PROPOSE_ORACLE_DISPUTE",
          disputeId: "dispute_1",
          syndicateId: "beta",
          anomalyStep: 5,
          disputeStake: 200,
          timestamp: 2000,
        } as any,
      },
      mockPack
    );

    expect(stepResult3.ok).toBe(true);
    state = stepResult3.state;

    // Verify Beta war chest decreased by 200 disputeStake
    expect(state.syndicates?.beta.warChest).toBe(9800);
    expect(state.sweepPoolWeatherForecastOracleDisputes?.["dispute_1"]?.status).toBe("proposed");

    // 6. Vote to authorize the dispute by Charlie (Bob's true vote + Charlie's true vote = 2/2 > 1 majority)
    let stepResult4 = multiAgentStep(
      state,
      {
        agentId: "charlie",
        action: {
          type: "VOTE_ORACLE_DISPUTE",
          syndicateId: "beta",
          disputeId: "dispute_1",
          vote: true,
          timestamp: 2010,
        } as any,
      },
      mockPack
    );

    expect(stepResult4.ok).toBe(true);
    state = stepResult4.state;

    // Verify dispute resolved as won/authorized
    expect(state.sweepPoolWeatherForecastOracleDisputes?.["dispute_1"]?.status).toBe("authorized");
    expect(state.sweepPoolWeatherForecastOracleDisputes?.["dispute_1"]?.resolved).toBe(true);

    // Verify stake refunds and bounty distributions:
    // - Beta refunded 200 dispute stake.
    // - Beta awarded 50% bounty of the oracle stake: 800 * 0.5 = 400 gold.
    // - Total Beta warChest = 9800 + 200 + 400 = 10400 gold.
    expect(state.syndicates?.beta.warChest).toBe(10400);

    // - Sweep Pool gets 50% of the oracle stake: 400 gold.
    // - Total sweep pool = 1000 - hedgeCost + 400 = 1400 gold. (hedging cost was 900, so 1000 - 900 + 400 = 500)
    expect(state.swfStakingSweepPool).toBe(500);

    // - Oracle's reputation slashed by 50: 100 - 50 = 50.
    expect(state.sweepPoolWeatherForecastOracleReputation).toBe(50);

    // - Since reputation 50 is below threshold 60, oracle is DE-AUTHORIZED
    expect(state.sweepPoolWeatherForecastOracleAuthorized).toBe(false);
    expect(state.sweepPoolWeatherForecastOracleStake).toBe(0);
    expect(state.journal?.some(j => j.includes("[Oracle Dispute Resolved - Slashed]"))).toBe(true);
  });

  it("should penalize disputing syndicate if dispute is dismissed", () => {
    let state = createInitialState({
      seed: 12345,
      start: "clearing",
      varsInit: { gold: 3000 },
      agentsInit: ["player", "alice", "bob", "charlie"],
    });

    state.syndicates = {
      alpha: {
        id: "alpha",
        name: "Alpha Syndicate",
        members: ["player"],
        definedBy: "player",
        timestamp: 1000,
        warChest: 10000,
      },
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "charlie"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 10000,
      },
    };

    // Authorize Oracle with Provider = alpha
    state.sweepPoolWeatherForecastOracleAuthorized = true;
    state.sweepPoolWeatherForecastOracleProvider = "alpha";
    state.sweepPoolWeatherForecastOracleStake = 500;
    state.sweepPoolWeatherForecastOracleReputation = 100;
    state.sweepPoolWeatherForecastOracleReputationThreshold = 60;

    // Simulate Anomaly
    state.weatherForecastAnomalies = [10];

    // Bob proposes a dispute targeting anomalyStep 10 (Bob votes true automatically on proposal)
    let stepResult = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "PROPOSE_ORACLE_DISPUTE",
          disputeId: "dispute_2",
          syndicateId: "beta",
          anomalyStep: 10,
          disputeStake: 300,
          timestamp: 3000,
        } as any,
      },
      mockPack
    );

    expect(stepResult.ok).toBe(true);
    state = stepResult.state;
    expect(state.syndicates?.beta.warChest).toBe(9700);
    expect(state.sweepPoolWeatherForecastOracleDisputes?.["dispute_2"]?.status).toBe("proposed");

    // Bob votes false to dismiss his own dispute (Bob changes vote from true to false, making falseVotes 1/2 >= 1 majority)
    let stepResult2 = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "VOTE_ORACLE_DISPUTE",
          syndicateId: "beta",
          disputeId: "dispute_2",
          vote: false,
          timestamp: 3010,
        } as any,
      },
      mockPack
    );

    expect(stepResult2.ok).toBe(true);
    state = stepResult2.state;

    // Verify dispute resolved as dismissed/disputed
    expect(state.sweepPoolWeatherForecastOracleDisputes?.["dispute_2"]?.status).toBe("disputed");
    expect(state.sweepPoolWeatherForecastOracleDisputes?.["dispute_2"]?.resolved).toBe(true);

    // Beta war chest remains penalized (no refund)
    expect(state.syndicates?.beta.warChest).toBe(9700);

    // 50% of disputeStake (150 gold) rewarded to oracle provider alpha, 50% (150 gold) to sweep pool
    expect(state.syndicates?.alpha.warChest).toBe(10150);
    expect(state.swfStakingSweepPool).toBe(150);
    expect(state.journal?.some(j => j.includes("[Oracle Dispute Dismissed - Slashed]"))).toBe(true);
  });
});
