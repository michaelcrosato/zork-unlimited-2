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

  it("should support multiple oracles, aggregate forecasting, and selective joint slashing during disputes (AF-216)", () => {
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

    // 1. Authorize Oracle 1 (from Alpha)
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

    // 2. Authorize Oracle 2 (from Beta)
    let stepResult3 = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "PROPOSE_WEATHER_FORECAST_ORACLE",
          proposalId: "oracle_prop_2",
          syndicateId: "beta",
          oracleReputationThreshold: 50,
          forecastAccuracyFloor: 85,
          oracleStake: 1000,
          timestamp: 1030,
        } as any,
      },
      mockPack
    );
    expect(stepResult3.ok).toBe(true);
    state = stepResult3.state;

    let stepResult4 = multiAgentStep(
      state,
      {
        agentId: "charlie",
        action: {
          type: "VOTE_WEATHER_FORECAST_ORACLE",
          syndicateId: "beta",
          proposalId: "oracle_prop_2",
          vote: true,
          timestamp: 1040,
        } as any,
      },
      mockPack
    );
    expect(stepResult4.ok).toBe(true);
    state = stepResult4.state;

    // Verify both are registered
    expect(state.weatherForecastOracles?.["oracle_prop_1"]).toBeDefined();
    expect(state.weatherForecastOracles?.["oracle_prop_2"]).toBeDefined();
    expect(state.weatherForecastOracles?.["oracle_prop_1"]?.reputation).toBe(100);
    expect(state.weatherForecastOracles?.["oracle_prop_2"]?.reputation).toBe(100);

    // 3. Setup Volatility Hedging Policy
    state.sweepPoolVolatilityHedgingPolicyAuthorized = true;
    state.sweepPoolVolatilityHedgingThreshold = 30;
    state.sweepPoolVolatilityHedgingRatio = 80;
    state.sweepPoolVolatilityHedgingReserveFloor = 100;
    state.swfStakingSweepPool = 1000;

    // Introduce weather forecast overrides for step 5
    state.weatherForecastOracleIndividualOverrides = {
      "5": {
        "oracle_prop_1": 80,
        "oracle_prop_2": 10,
      }
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

    // Verify the predictions saved in history
    expect(state.weatherForecastOracleHistory?.["5"]?.["oracle_prop_1"]).toBe(80);
    expect(state.weatherForecastOracleHistory?.["5"]?.["oracle_prop_2"]).toBe(10);
    
    // Weighted average: (80*100 + 10*100) / 200 = 45
    expect(state.weatherForecastHistory?.["5"]).toBe(45);

    // 4. Tick to step 5. Set actual weather to "clear"/"calm" (volatility 5)
    state.step = 5;
    state.environment = {
      weather: "clear", // 5 vol
      temperature: "mild",
      wind: "calm", // 0 vol => total 5
      lastUpdatedStep: 5,
    };

    state = tickEconomy(state, mockPack);

    // Anomaly mismatch: Math.abs(45 - 5) = 40 > 20 -> should be registered
    expect(state.weatherForecastAnomalies).toContain(5);

    // 5. File a dispute by Beta syndicate targeting anomaly at step 5
    let stepResult5 = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "PROPOSE_ORACLE_DISPUTE",
          disputeId: "dispute_joint_1",
          syndicateId: "beta",
          anomalyStep: 5,
          disputeStake: 200,
          timestamp: 2000,
        } as any,
      },
      mockPack
    );
    expect(stepResult5.ok).toBe(true);
    state = stepResult5.state;

    // Vote to authorize dispute by Charlie
    let stepResult6 = multiAgentStep(
      state,
      {
        agentId: "charlie",
        action: {
          type: "VOTE_ORACLE_DISPUTE",
          syndicateId: "beta",
          disputeId: "dispute_joint_1",
          vote: true,
          timestamp: 2010,
        } as any,
      },
      mockPack
    );
    expect(stepResult6.ok).toBe(true);
    state = stepResult6.state;

    // Verify Dispute resolved as won
    expect(state.sweepPoolWeatherForecastOracleDisputes?.["dispute_joint_1"]?.status).toBe("authorized");

    // Slashing Verification:
    // Oracle 1 predicted 80 (actual 5, mismatch 75 > 20) -> should be slashed
    // Oracle 2 predicted 10 (actual 5, mismatch 5 <= 20) -> should NOT be slashed
    expect(state.weatherForecastOracles?.["oracle_prop_1"]?.reputation).toBe(50);
    expect(state.weatherForecastOracles?.["oracle_prop_1"]?.stake).toBe(0);

    expect(state.weatherForecastOracles?.["oracle_prop_2"]?.reputation).toBe(100);
    expect(state.weatherForecastOracles?.["oracle_prop_2"]?.stake).toBe(1000);
  });

  it("should support targeted disputes that only slash a specific oracle (AF-216)", () => {
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

    // Propose and authorize Oracle 1 and Oracle 2
    state.sweepPoolWeatherForecastOracleAuthorized = true;
    state.weatherForecastOracles = {
      "oracle_prop_1": {
        id: "oracle_prop_1",
        provider: "alpha",
        stake: 800,
        reputation: 100,
        accuracyFloor: 90,
        reputationThreshold: 60,
        timestamp: 1000,
      },
      "oracle_prop_2": {
        id: "oracle_prop_2",
        provider: "beta",
        stake: 1000,
        reputation: 100,
        accuracyFloor: 85,
        reputationThreshold: 50,
        timestamp: 1000,
      }
    };

    // Register anomaly
    state.weatherForecastAnomalies = [15];

    // File a TARGETED dispute by Alpha targeting oracle_prop_2 specifically
    let stepResult = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_ORACLE_DISPUTE",
          disputeId: "targeted_dispute_1",
          syndicateId: "alpha",
          anomalyStep: 15,
          disputeStake: 200,
          targetOracleId: "oracle_prop_2",
          timestamp: 2000,
        } as any,
      },
      mockPack
    );
    expect(stepResult.ok).toBe(true);
    state = stepResult.state;

    // Vote to authorize dispute by Alice
    let stepResult2 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_ORACLE_DISPUTE",
          syndicateId: "alpha",
          disputeId: "targeted_dispute_1",
          vote: true,
          timestamp: 2010,
        } as any,
      },
      mockPack
    );
    expect(stepResult2.ok).toBe(true);
    state = stepResult2.state;

    // Verify dispute resolved as won
    expect(state.sweepPoolWeatherForecastOracleDisputes?.["targeted_dispute_1"]?.status).toBe("authorized");

    // Only oracle_prop_2 (targeted) should be slashed, oracle_prop_1 remains untouched
    expect(state.weatherForecastOracles?.["oracle_prop_2"]?.reputation).toBe(50);
    expect(state.weatherForecastOracles?.["oracle_prop_2"]?.stake).toBe(0);

    expect(state.weatherForecastOracles?.["oracle_prop_1"]?.reputation).toBe(100);
    expect(state.weatherForecastOracles?.["oracle_prop_1"]?.stake).toBe(800);
  });

  it("should support proposing and voting on penalty waivers and grace period deferrals (AF-217)", () => {
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

    // 1. Authorize 2 Oracles to create a multi-oracle setup
    state.sweepPoolWeatherForecastOracleAuthorized = true;
    state.weatherForecastOracles = {
      "oracle_prop_1": {
        id: "oracle_prop_1",
        provider: "alpha",
        stake: 800,
        reputation: 100,
        accuracyFloor: 90,
        reputationThreshold: 60,
        timestamp: 1000,
      },
      "oracle_prop_2": {
        id: "oracle_prop_2",
        provider: "beta",
        stake: 1000,
        reputation: 100,
        accuracyFloor: 85,
        reputationThreshold: 50,
        timestamp: 1000,
      }
    };

    // Populate oracle predictions history at anomalyStep 5 to make it a multi-oracle failure
    state.weatherForecastOracleHistory = {
      "5": {
        "oracle_prop_1": 80,
        "oracle_prop_2": 80,
      }
    };
    state.weatherForecastHistory = {
      "5": 80,
    };
    state.weatherForecastAnomalies = [5];

    // File a dispute targeting anomaly at step 5
    let stepResult = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_ORACLE_DISPUTE",
          disputeId: "dispute_multi_1",
          syndicateId: "alpha",
          anomalyStep: 5,
          disputeStake: 200,
          timestamp: 2000,
        } as any,
      },
      mockPack
    );
    expect(stepResult.ok).toBe(true);
    state = stepResult.state;

    // Propose Penalty Waiver / Grace Period of 10 steps
    let stepResult3 = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "PROPOSE_MULTI_ORACLE_PENALTY_WAIVER",
          proposalId: "waiver_prop_1",
          syndicateId: "beta",
          disputeId: "dispute_multi_1",
          waivePenalty: false,
          gracePeriodSteps: 10,
          timestamp: 2020,
        } as any,
      },
      mockPack
    );
    expect(stepResult3.ok).toBe(true);
    state = stepResult3.state;

    // Vote to authorize the waiver by Charlie
    let stepResult4 = multiAgentStep(
      state,
      {
        agentId: "charlie",
        action: {
          type: "VOTE_MULTI_ORACLE_PENALTY_WAIVER",
          syndicateId: "beta",
          proposalId: "waiver_prop_1",
          vote: true,
          timestamp: 2030,
        } as any,
      },
      mockPack
    );
    expect(stepResult4.ok).toBe(true);
    state = stepResult4.state;

    expect(state.multiOraclePenaltyWaiverProposals?.["waiver_prop_1"]?.status).toBe("authorized");

    // Vote to authorize the dispute by Alice (now waiver is authorized, so this will trigger deferral)
    let stepResult2 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_ORACLE_DISPUTE",
          syndicateId: "alpha",
          disputeId: "dispute_multi_1",
          vote: true,
          timestamp: 2010,
        } as any,
      },
      mockPack
    );
    expect(stepResult2.ok).toBe(true);
    state = stepResult2.state;

    // Since step is 6 (reconciled through actions), and anomalyStep is 5,
    // step 6 is less than anomalyStep 5 + gracePeriodSteps 10 = 15.
    // Dispute should remain unresolved/deferred!
    expect(state.sweepPoolWeatherForecastOracleDisputes?.["dispute_multi_1"]?.resolved).toBe(false);
    expect(state.sweepPoolWeatherForecastOracleDisputes?.["dispute_multi_1"]?.status).toBe("proposed");
    expect(state.journal?.some(j => j.includes("[Oracle Dispute Deferred] Dispute dispute_multi_1"))).toBe(true);

    // Fast forward step to 15
    state.step = 15;
    let stepResult5 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "VOTE_ORACLE_DISPUTE", // just cast a duplicate vote or any valid action to trigger tick economy / dispute reconciliation
          syndicateId: "alpha",
          disputeId: "dispute_multi_1",
          vote: true,
          timestamp: 2040,
        } as any,
      },
      mockPack
    );
    expect(stepResult5.ok).toBe(true);
    state = stepResult5.state;

    // Now step is 16, which is >= 15. The dispute should be successfully resolved and slashed!
    expect(state.sweepPoolWeatherForecastOracleDisputes?.["dispute_multi_1"]?.resolved).toBe(true);
    expect(state.sweepPoolWeatherForecastOracleDisputes?.["dispute_multi_1"]?.status).toBe("authorized");
    expect(state.weatherForecastOracles?.["oracle_prop_1"]?.stake).toBe(0);
    expect(state.weatherForecastOracles?.["oracle_prop_2"]?.stake).toBe(0);
  });

  it("should support penalty waivers with waivePenalty set to true (AF-217)", () => {
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

    state.sweepPoolWeatherForecastOracleAuthorized = true;
    state.weatherForecastOracles = {
      "oracle_prop_1": {
        id: "oracle_prop_1",
        provider: "alpha",
        stake: 800,
        reputation: 100,
        accuracyFloor: 90,
        reputationThreshold: 60,
        timestamp: 1000,
      },
      "oracle_prop_2": {
        id: "oracle_prop_2",
        provider: "beta",
        stake: 1000,
        reputation: 100,
        accuracyFloor: 85,
        reputationThreshold: 50,
        timestamp: 1000,
      }
    };

    state.weatherForecastOracleHistory = {
      "5": {
        "oracle_prop_1": 80,
        "oracle_prop_2": 80,
      }
    };
    state.weatherForecastHistory = {
      "5": 80,
    };
    state.weatherForecastAnomalies = [5];
    state.swfStakingSweepPool = 1000;

    // File dispute targeting anomaly at step 5
    let stepResult = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_ORACLE_DISPUTE",
          disputeId: "dispute_multi_2",
          syndicateId: "alpha",
          anomalyStep: 5,
          disputeStake: 200,
          timestamp: 2000,
        } as any,
      },
      mockPack
    );
    state = stepResult.state;

    // Propose Penalty Waiver (waivePenalty = true)
    let stepResult2 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_MULTI_ORACLE_PENALTY_WAIVER",
          proposalId: "waiver_prop_2",
          syndicateId: "alpha",
          disputeId: "dispute_multi_2",
          waivePenalty: true,
          timestamp: 2010,
        } as any,
      },
      mockPack
    );
    state = stepResult2.state;

    // Authorize Waiver
    let stepResult3 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_MULTI_ORACLE_PENALTY_WAIVER",
          syndicateId: "alpha",
          proposalId: "waiver_prop_2",
          vote: true,
          timestamp: 2020,
        } as any,
      },
      mockPack
    );
    state = stepResult3.state;

    expect(state.multiOraclePenaltyWaiverProposals?.["waiver_prop_2"]?.status).toBe("authorized");

    // Authorize dispute by Alice
    let stepResult4 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_ORACLE_DISPUTE",
          syndicateId: "alpha",
          disputeId: "dispute_multi_2",
          vote: true,
          timestamp: 2030,
        } as any,
      },
      mockPack
    );
    state = stepResult4.state;

    // Verify dispute resolved as won
    expect(state.sweepPoolWeatherForecastOracleDisputes?.["dispute_multi_2"]?.status).toBe("authorized");

    // Since waivePenalty was authorized:
    // 1. Oracle reputation and stakes should remain unchanged (100 rep, stakes intact)!
    expect(state.weatherForecastOracles?.["oracle_prop_1"]?.reputation).toBe(100);
    expect(state.weatherForecastOracles?.["oracle_prop_1"]?.stake).toBe(800);
    expect(state.weatherForecastOracles?.["oracle_prop_2"]?.reputation).toBe(100);
    expect(state.weatherForecastOracles?.["oracle_prop_2"]?.stake).toBe(1000);

    // 2. Disputing syndicate alpha gets refunded disputeStake (200), plus bounties (800*0.5 + 1000*0.5 = 900) paid from sweep pool.
    // Proposing dispute raw cost: warchest goes from 10000 -> 9800.
    // Refund: 9800 + 200 (dispute stake) + 900 (bounties) = 10900.
    expect(state.syndicates?.alpha.warChest).toBe(10900);
    // Sweep pool decremented by 900 bounties: 1000 - 900 = 100.
    expect(state.swfStakingSweepPool).toBe(100);
  });

  it("should support proposing and voting on refund escalations (AF-217)", () => {
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

    state.sweepPoolWeatherForecastOracleAuthorized = true;
    state.weatherForecastOracles = {
      "oracle_prop_1": {
        id: "oracle_prop_1",
        provider: "alpha",
        stake: 800,
        reputation: 100,
        accuracyFloor: 90,
        reputationThreshold: 60,
        timestamp: 1000,
      },
      "oracle_prop_2": {
        id: "oracle_prop_2",
        provider: "beta",
        stake: 1000,
        reputation: 100,
        accuracyFloor: 85,
        reputationThreshold: 50,
        timestamp: 1000,
      }
    };

    state.weatherForecastOracleHistory = {
      "5": {
        "oracle_prop_1": 80,
        "oracle_prop_2": 80,
      }
    };
    state.weatherForecastHistory = {
      "5": 80,
    };
    state.weatherForecastAnomalies = [5];
    state.swfStakingSweepPool = 1000;

    // File dispute targeting anomaly at step 5
    let stepResult = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_ORACLE_DISPUTE",
          disputeId: "dispute_multi_3",
          syndicateId: "alpha",
          anomalyStep: 5,
          disputeStake: 200,
          timestamp: 2000,
        } as any,
      },
      mockPack
    );
    state = stepResult.state;

    // Propose Refund Escalation (refundSurchargePercent = 50%)
    let stepResult2 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_MULTI_ORACLE_REFUND_ESCALATION",
          proposalId: "escalation_prop_1",
          syndicateId: "alpha",
          disputeId: "dispute_multi_3",
          refundSurchargePercent: 50,
          timestamp: 2010,
        } as any,
      },
      mockPack
    );
    state = stepResult2.state;

    // Vote to authorize escalation
    let stepResult3 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_MULTI_ORACLE_REFUND_ESCALATION",
          syndicateId: "alpha",
          proposalId: "escalation_prop_1",
          vote: true,
          timestamp: 2020,
        } as any,
      },
      mockPack
    );
    state = stepResult3.state;

    expect(state.multiOracleRefundEscalationProposals?.["escalation_prop_1"]?.status).toBe("authorized");

    // Vote to authorize dispute
    let stepResult4 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_ORACLE_DISPUTE",
          syndicateId: "alpha",
          disputeId: "dispute_multi_3",
          vote: true,
          timestamp: 2030,
        } as any,
      },
      mockPack
    );
    state = stepResult4.state;

    expect(state.sweepPoolWeatherForecastOracleDisputes?.["dispute_multi_3"]?.status).toBe("authorized");

    // Under refundSurchargePercent = 50%:
    // 1. Refund contains original disputeStake (200) + refundBonus (200 * 50% = 100) = 300.
    // 2. Bounty percent scaled from 50% to 100% (50 + 50):
    //    Oracle 1 bounty: 800 * 100% = 800.
    //    Oracle 2 bounty: 1000 * 100% = 1000.
    //    Total bounty = 1800.
    // Total warChest update: 9800 + 300 (refund) + 1800 (bounty) = 11900.
    expect(state.syndicates?.alpha.warChest).toBe(11900);
    // Sweep pool decremented by 100 refundBonus: 1000 - 100 = 900. (Oracles slashed stakes sweep share is 0 since bounty is 100%)
    expect(state.swfStakingSweepPool).toBe(900);
  });

  it("should enforce validation checks restricting proposal to disputes involving multi-oracle failures", () => {
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
    };

    // Single oracle setup
    state.sweepPoolWeatherForecastOracleAuthorized = true;
    state.weatherForecastOracles = {
      "oracle_prop_1": {
        id: "oracle_prop_1",
        provider: "alpha",
        stake: 800,
        reputation: 100,
        accuracyFloor: 90,
        reputationThreshold: 60,
        timestamp: 1000,
      }
    };
    state.weatherForecastHistory = {
      "5": 80,
    };
    state.weatherForecastAnomalies = [5];

    // File dispute targeting anomaly at step 5
    let stepResult = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_ORACLE_DISPUTE",
          disputeId: "dispute_single_1",
          syndicateId: "alpha",
          anomalyStep: 5,
          disputeStake: 200,
          timestamp: 2000,
        } as any,
      },
      mockPack
    );
    state = stepResult.state;

    // Attempt to propose penalty waiver for a dispute involving a single oracle failure (should reject)
    let stepResult2 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_MULTI_ORACLE_PENALTY_WAIVER",
          proposalId: "waiver_prop_reject",
          syndicateId: "alpha",
          disputeId: "dispute_single_1",
          waivePenalty: true,
          timestamp: 2010,
        } as any,
      },
      mockPack
    );
    expect(stepResult2.ok).toBe(false);
    expect(stepResult2.rejectionReason).toContain("does not involve a multi-oracle aggregate forecasting failure");

    // Attempt to propose refund escalation for a dispute involving a single oracle failure (should reject)
    let stepResult3 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_MULTI_ORACLE_REFUND_ESCALATION",
          proposalId: "escalation_prop_reject",
          syndicateId: "alpha",
          disputeId: "dispute_single_1",
          refundSurchargePercent: 50,
          timestamp: 2020,
        } as any,
      },
      mockPack
    );
    expect(stepResult3.ok).toBe(false);
    expect(stepResult3.rejectionReason).toContain("does not involve a multi-oracle aggregate forecasting failure");
  });

  it("should support proposing, voting, and authorizing dynamic security insurance pools, allocating penalty yields/surpluses, and respecting pool caps (AF-218)", () => {
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
    };

    // Before authorizing oracle, proposing insurance pool should reject
    let stepResult0 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_SECURITY_INSURANCE_POOL",
          proposalId: "pool_prop_reject",
          syndicateId: "alpha",
          allocationPercent: 20,
          poolCap: 2000,
          timestamp: 1001,
        } as any,
      },
      mockPack
    );
    expect(stepResult0.ok).toBe(false);
    expect(stepResult0.rejectionReason).toContain("No weather forecast oracle is currently authorized");

    // Propose and authorize Oracle 1
    state.sweepPoolWeatherForecastOracleAuthorized = true;
    state.weatherForecastOracles = {
      "oracle_prop_1": {
        id: "oracle_prop_1",
        provider: "alpha",
        stake: 800,
        reputation: 100,
        accuracyFloor: 90,
        reputationThreshold: 40,
        timestamp: 1000,
      }
    };

    // Now proposal should succeed! Proposing syndicate has allies = 0, proposer warChest = 10000.
    // Dynamic Proposal Fee: 200 base * allianceScalar(1.0) * reserveScalar(0.5) = 100 gold
    let stepResult = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_SECURITY_INSURANCE_POOL",
          proposalId: "pool_prop_1",
          syndicateId: "alpha",
          allocationPercent: 30, // 30% allocation
          poolCap: 300, // 300 gold cap
          timestamp: 1005,
        } as any,
      },
      mockPack
    );

    expect(stepResult.ok).toBe(true);
    state = stepResult.state;
    
    // Proposer war chest decreased by proposal fee (100)
    expect(state.syndicates?.alpha.warChest).toBe(9900);
    expect(state.swfSecurityInsurancePoolProposals?.["pool_prop_1"]?.status).toBe("proposed");

    // Alice votes true to authorize (majority is 2/2 > 1)
    // Dynamic Vote Fee: 50 base * allianceScalar(1.0) * reserveScalar(0.5) = 25 gold
    let stepResult2 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_SECURITY_INSURANCE_POOL",
          proposalId: "pool_prop_1",
          syndicateId: "alpha",
          vote: true,
          timestamp: 1010,
        } as any,
      },
      mockPack
    );

    expect(stepResult2.ok).toBe(true);
    state = stepResult2.state;

    // Alice war chest decreased by vote fee (28)
    expect(state.syndicates?.alpha.warChest).toBe(9872);
    expect(state.swfSecurityInsurancePoolProposals?.["pool_prop_1"]?.status).toBe("authorized");
    expect(state.swfSecurityInsurancePoolAuthorized).toBe(true);
    expect(state.swfSecurityInsurancePoolAllocationPercent).toBe(30);
    expect(state.swfSecurityInsurancePoolCap).toBe(300);

    // Setup weather forecast anomaly
    state.weatherForecastOracleHistory = {
      "5": {
        "oracle_prop_1": 80,
      }
    };
    state.weatherForecastHistory = {
      "5": 80,
    };
    state.weatherForecastAnomalies = [5];

    // File a dispute targeting anomaly at step 5
    let stepResult3 = multiAgentStep(
      state,
      {
        agentId: "player",
        action: {
          type: "PROPOSE_ORACLE_DISPUTE",
          disputeId: "dispute_1",
          syndicateId: "alpha",
          anomalyStep: 5,
          disputeStake: 200,
          timestamp: 2000,
        } as any,
      },
      mockPack
    );
    expect(stepResult3.ok).toBe(true);
    state = stepResult3.state;

    // Alice votes true to authorize the dispute
    let stepResult4 = multiAgentStep(
      state,
      {
        agentId: "alice",
        action: {
          type: "VOTE_ORACLE_DISPUTE",
          syndicateId: "alpha",
          disputeId: "dispute_1",
          vote: true,
          timestamp: 2010,
        } as any,
      },
      mockPack
    );
    expect(stepResult4.ok).toBe(true);
    state = stepResult4.state;

    // Oracle was slashed!
    // Active oracle stake = 800. Bounty percent = 50%.
    // Bounty = 400. Remaining slashed stake (penalty yield) = 400.
    // 30% of 400 = 120 gold allocated to security insurance pool.
    // Remaining 400 - 120 = 280 gold added to sweep pool.
    expect(state.swfSecurityInsurancePool).toBe(120);
    expect(state.swfStakingSweepPool).toBe(280);

    // File a second dispute to test pool cap (let's simulate a dismissed dispute stake slashing of 1000 gold)
    // Dismissed dispute on anomaly 5. Disputing stake = 1000.
    // Propose a dispute by Beta (bob)
    state.syndicates = {
      ...state.syndicates,
      beta: {
        id: "beta",
        name: "Beta Syndicate",
        members: ["bob", "charlie"],
        definedBy: "bob",
        timestamp: 1000,
        warChest: 10000,
      }
    };

    let stepResult5 = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "PROPOSE_ORACLE_DISPUTE",
          disputeId: "dispute_2",
          syndicateId: "beta",
          anomalyStep: 5,
          disputeStake: 1000,
          timestamp: 3000,
        } as any,
      },
      mockPack
    );
    expect(stepResult5.ok).toBe(true);
    state = stepResult5.state;

    // Bob votes false to dismiss
    let stepResult6 = multiAgentStep(
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
    expect(stepResult6.ok).toBe(true);
    state = stepResult6.state;

    // Dispute is dismissed!
    // Dispute stake = 1000. Since provider is undefined, the entire dispute stake goes to the sweep pool (1000).
    // The sweep pool share (1000) is allocated to the security insurance pool:
    // allocationPercent is 30% of 1000 = 300 gold.
    // Cap is 300 gold. Current pool has 120 gold. Space left = 180 gold.
    // Since 300 > 180, only 180 gold is allocated!
    // New security pool balance = 120 + 180 = 300 gold (exactly at cap).
    // Remaining sweep pool share 1000 - 180 = 820 gold added to sweep pool.
    // Total sweep pool = 280 (from before) + 820 = 1100 gold.
    expect(state.swfSecurityInsurancePool).toBe(300);
    expect(state.swfStakingSweepPool).toBe(1100);

    // Let's trigger another dispute dismissal with stake = 500 gold.
    let stepResult7 = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "PROPOSE_ORACLE_DISPUTE",
          disputeId: "dispute_3",
          syndicateId: "beta",
          anomalyStep: 5,
          disputeStake: 500,
          timestamp: 4000,
        } as any,
      },
      mockPack
    );
    expect(stepResult7.ok).toBe(true);
    state = stepResult7.state;

    let stepResult8 = multiAgentStep(
      state,
      {
        agentId: "bob",
        action: {
          type: "VOTE_ORACLE_DISPUTE",
          syndicateId: "beta",
          disputeId: "dispute_3",
          vote: false,
          timestamp: 4010,
        } as any,
      },
      mockPack
    );
    expect(stepResult8.ok).toBe(true);
    state = stepResult8.state;

    // Dismissed dispute!
    // Dispute stake = 500. Since provider is undefined, all goes to sweep pool (500).
    // Space left in insurance pool is 0 (already at cap of 300).
    // So 0 gold is allocated to the security insurance pool.
    // All 500 gold added to sweep pool.
    // Total security pool = 300 gold.
    // Total sweep pool = 1100 + 500 = 1600 gold.
    expect(state.swfSecurityInsurancePool).toBe(300);
    expect(state.swfStakingSweepPool).toBe(1600);
  });
});

