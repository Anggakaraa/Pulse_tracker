import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://cfybwyypcttazfinxhvz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmeWJ3eXlwY3R0YXpmaW54aHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTQzMzgsImV4cCI6MjA5NjA3MDMzOH0.vFhAGWfTRjzpieX3iujY3oM9InWIYITA0qSlTewl-2k"
);

async function seed() {
  // Insert a test entry
  const { data: test, error: testError } = await supabase
    .from("tests")
    .insert({ date: "2025-01-15", lab_name: "Seed Lab" })
    .select()
    .single();

  if (testError) {
    console.error("Failed to insert test:", testError.message);
    process.exit(1);
  }

  console.log("✓ Test inserted:", test.id);

  // Insert a few sample readings
  const readings = [
    {
      test_id: test.id,
      metric_key: "ldl_c",
      value: 2.8,
      unit: "mmol/L",
      lab_range_low: null,
      lab_range_high: 3.4,
      optimal_range_low: null,
      optimal_range_high: 1.8,
      attention_state: "suboptimal",
    },
    {
      test_id: test.id,
      metric_key: "hdl_c",
      value: 1.7,
      unit: "mmol/L",
      lab_range_low: 1.0,
      lab_range_high: null,
      optimal_range_low: 1.6,
      optimal_range_high: null,
      attention_state: "clear",
    },
    {
      test_id: test.id,
      metric_key: "hba1c",
      value: 36,
      unit: "mmol/mol",
      lab_range_low: null,
      lab_range_high: 48,
      optimal_range_low: null,
      optimal_range_high: 39,
      attention_state: "clear",
    },
    {
      test_id: test.id,
      metric_key: "vitamin_d",
      value: 82,
      unit: "nmol/L",
      lab_range_low: 50,
      lab_range_high: 125,
      optimal_range_low: 100,
      optimal_range_high: 150,
      attention_state: "suboptimal",
    },
    {
      test_id: test.id,
      metric_key: "hs_crp",
      value: 0.6,
      unit: "mg/L",
      lab_range_low: null,
      lab_range_high: 3.0,
      optimal_range_low: null,
      optimal_range_high: 0.8,
      attention_state: "watch",
    },
  ];

  const { error: readingsError } = await supabase
    .from("readings")
    .insert(readings);

  if (readingsError) {
    console.error("Failed to insert readings:", readingsError.message);
    process.exit(1);
  }

  console.log(`✓ ${readings.length} readings inserted`);
  console.log("Seed complete.");
}

seed();
