import type { LoadInputs, LoadOutputs, DbScalingStrategy } from "@/lib/types";
import { RPS_PER_SERVER, DB_SCALING_THRESHOLDS } from "@/lib/constants";

/**
 * Compute all headline load metrics from the nine user-supplied inputs.
 * Every variable is commented so the derivation is auditable.
 */
export function calculateLoad(inputs: LoadInputs): LoadOutputs {
  // Total requests issued across the entire day by all active users
  const requestsPerDay =
    inputs.dailyActiveUsers * inputs.requestsPerUserPerDay;

  // Spread over 24 hours to get an hourly rate
  const requestsPerHour = requestsPerDay / 24;

  // Spread over 60 minutes per hour to get a per-minute rate
  const requestsPerMinute = requestsPerHour / 60;

  // Mean sustained throughput across the full day (seconds in a day = 86 400)
  const averageRps = requestsPerDay / 86_400;

  // Multiply average by the diurnal spike factor to get the design ceiling
  const peakRps = averageRps * inputs.peakFactor;

  // Peak egress bandwidth: requests-per-second × bytes per request
  const peakBandwidthBytesPerSec = peakRps * inputs.avgPayloadBytes;

  // Total bytes transferred in one day across all requests
  const bandwidthPerDayBytes = requestsPerDay * inputs.avgPayloadBytes;

  // Durable write volume that drives database/object-store growth
  const writesPerDay = inputs.dailyActiveUsers * inputs.writesPerUserPerDay;

  // Storage added to the system each day (one record per write)
  const storageGrowthPerDayBytes = writesPerDay * inputs.avgPayloadBytes;

  // Total live storage required to satisfy the retention policy
  const retentionStorageBytes = storageGrowthPerDayBytes * inputs.retentionDays;

  // Effective DB request rate at peak:
  //   writes always reach the primary                    → peakRps × writeRatio
  //   reads that miss the cache also reach the primary   → peakRps × readRatio × cacheMissRatio
  const dbLoadRps =
    peakRps * (1 - inputs.readRatio) + // write portion — always hits DB
    peakRps * inputs.readRatio * (1 - inputs.cacheHitRatio); // cache-miss reads

  // Read RPS absorbed by the cache layer, never touching the primary DB
  const cacheSavingsRps = peakRps * inputs.readRatio * inputs.cacheHitRatio;

  // Minimum number of app servers needed to sustain peak load
  const rawServers = Math.ceil(peakRps / RPS_PER_SERVER);

  // Apply the redundancy factor for N+x headroom / rolling deploys
  const suggestedServers = Math.ceil(rawServers * inputs.redundancyFactor);

  // Select the DB scaling tier based on effective DB RPS at peak
  let dbScalingStrategy: DbScalingStrategy;
  if (dbLoadRps <= DB_SCALING_THRESHOLDS.singlePrimaryMaxRps) {
    // A single primary handles the load comfortably
    dbScalingStrategy = "single-primary";
  } else if (dbLoadRps <= DB_SCALING_THRESHOLDS.replicasMaxRps) {
    // Primary plus read replicas distributes the query load
    dbScalingStrategy = "primary-with-replicas";
  } else if (dbLoadRps <= DB_SCALING_THRESHOLDS.verticalMaxRps) {
    // Vertical scale-up of the primary combined with replicas
    dbScalingStrategy = "vertical-and-replicas";
  } else {
    // Load exceeds vertical limits — horizontal sharding required
    dbScalingStrategy = "sharded";
  }

  return {
    requestsPerDay,
    requestsPerHour,
    requestsPerMinute,
    averageRps,
    peakRps,
    peakBandwidthBytesPerSec,
    bandwidthPerDayBytes,
    storageGrowthPerDayBytes,
    retentionStorageBytes,
    dbLoadRps,
    cacheSavingsRps,
    suggestedServers,
    dbScalingStrategy,
  };
}
