import StatusBadge from "@/components/StatusBadge";
import CategoryPill from "@/components/CategoryPill";
import StatBlock from "@/components/StatBlock";
import Button from "@/components/Button";
import MetricRow from "@/components/MetricRow";
import CategoryCard from "@/components/CategoryCard";
import TestLogEntry from "@/components/TestLogEntry";
import TrendChart from "@/components/TrendChart";
import ExperimentTable from "@/components/ExperimentTable";
import UploadReviewRow from "@/components/UploadReviewRow";
import DropZone from "@/components/DropZone";
import Annotation from "@/components/Annotation";
import { colors } from "@/lib/tokens";

function Section({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ marginBottom: "40px" }}>
      <p style={{
        fontFamily: "var(--font-dm-sans)",
        fontSize: "11px",
        fontWeight: 300,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: colors.inkMuted,
        marginBottom: "12px",
      }}>
        {title}
      </p>
      <div style={{
        display: wide ? "block" : "flex",
        flexWrap: "wrap",
        gap: "8px",
        alignItems: "center",
        maxWidth: wide ? "720px" : undefined,
        border: wide ? `1px solid ${colors.border}` : undefined,
        borderRadius: wide ? "6px" : undefined,
        overflow: wide ? "hidden" : undefined,
        padding: wide ? "16px" : undefined,
      }}>
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div style={{ backgroundColor: colors.background, minHeight: "100vh", padding: "64px" }}>
      <p style={{
        fontFamily: "var(--font-outfit)",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: colors.inkMuted,
        marginBottom: "8px",
      }}>
        Pulse
      </p>
      <h1 style={{
        fontFamily: "var(--font-outfit)",
        fontSize: "28px",
        fontWeight: 600,
        color: colors.ink,
        marginBottom: "40px",
        letterSpacing: "-0.01em",
      }}>
        Component preview
      </h1>

      <Section title="C-04 · Status Badge">
        <StatusBadge badge="optimal" />
        <StatusBadge badge="stable" />
        <StatusBadge badge="improve" />
        <StatusBadge badge="act" />
      </Section>

      <Section title="C-05 · Category Pill">
        <CategoryPill category="metabolic" />
        <CategoryPill category="cardiovascular" />
        <CategoryPill category="inflammation" />
        <CategoryPill category="hormonal" />
        <CategoryPill category="nutritional" />
        <CategoryPill category="blood" />
      </Section>

      <Section title="C-06 · Stat Block">
        <div style={{ display: "flex", gap: "8px", width: "480px" }}>
          <StatBlock label="Optimal range" value="< 1.8 mmol/L" />
          <StatBlock label="Lab range" value="< 3.4 mmol/L" />
          <StatBlock label="Last tested" value="15 Jan 2025" />
        </div>
      </Section>

      <Section title="C-11 · Primary Button  +  C-12 · Ghost Button">
        <Button variant="primary">Save test</Button>
        <Button variant="ghost">Cancel</Button>
      </Section>

      <Section title="C-01 · Category Card">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 200px)", gap: "9px" }}>
          <CategoryCard
            category="cardiovascular"
            metricName="ApoB"
            value={0.82}
            unit="g/L"
            badge="improve"
          />
          <CategoryCard
            category="metabolic"
            metricName="HbA1c"
            value={36}
            unit="mmol/mol"
            badge="optimal"
          />
          <CategoryCard
            category="inflammation"
            metricName="hs-CRP"
            value={0.6}
            unit="mg/L"
            badge="stable"
          />
          <CategoryCard
            category="hormonal"
            metricName="Free testosterone"
            value={420}
            unit="pmol/L"
            badge="optimal"
          />
          <CategoryCard
            category="nutritional"
            metricName="Vitamin D"
            value={82}
            unit="nmol/L"
            badge="improve"
          />
          <CategoryCard
            category="blood"
          />
        </div>
      </Section>

      <Section title="C-09 · Test Log Entry" wide>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "4px 0" }}>
          <TestLogEntry
            date="15 Jan 2025"
            labName="LabCorp"
            markerCount={24}
            categories={["cardiovascular", "metabolic", "nutritional"]}
            statusSummary="2 need attention"
            statusState="improve"
          />
          <TestLogEntry
            date="3 Aug 2024"
            labName="LabCorp"
            markerCount={18}
            categories={["cardiovascular", "hormonal", "blood"]}
            statusSummary="All clear"
            statusState="optimal"
          />
          <TestLogEntry
            date="12 Feb 2023"
            labName="Quest Diagnostics"
            markerCount={14}
            categories={["metabolic", "inflammation"]}
            statusSummary="1 needs attention"
            statusState="act"
            isOld
          />
        </div>
      </Section>

      <Section title="C-08 · Experiment Progression Table" wide>
        <ExperimentTable
          experimentId="dev-preview"
          dates={["Aug 2024", "Jan 2025"]}
          testIds={["test-1", "test-2"]}
          columnLabels={{}}
          excludedTestIds={[]}

          metrics={[
            {
              key: "ldl_c",
              name: "LDL Cholesterol",
              unit: "mmol/L",
              category: "cardiovascular",
                            readings: [3.1, 2.8],
              states: ["improve", "improve"],
            },
            {
              key: "apob",
              name: "ApoB",
              unit: "g/L",
              category: "cardiovascular",
                            readings: [0.95, 0.82],
              states: ["improve", "improve"],
            },
            {
              key: "tg_hdl_ratio",
              name: "TG / HDL ratio",
              unit: "",
              category: "cardiovascular",
                            readings: [null, 1.2],
              states: [null, "improve"],
            },
            {
              key: "hs_crp",
              name: "hs-CRP",
              unit: "mg/L",
              category: "inflammation",
                            readings: [0.4, 0.6],
              states: ["optimal", "stable"],
            },
          ]}
        />
      </Section>

      <Section title="C-07 · Trend Chart" wide>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "8px 0", width: "100%" }}>

          {/* Full treatment — 5 points with reference bands */}
          <div>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "10px", color: colors.inkMuted, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              LDL Cholesterol · 5 readings · cardiovascular
            </p>
            <TrendChart
              category="cardiovascular"
              unit="mmol/L"
              optimalHigh={1.8}
              labHigh={3.4}
              data={[
                { date: "Jan 23", value: 3.6 },
                { date: "Aug 23", value: 3.2 },
                { date: "Jan 24", value: 2.9 },
                { date: "Aug 24", value: 3.1 },
                { date: "Jan 25", value: 2.8 },
              ]}
            />
          </div>

          {/* 2 points — line only, no bands */}
          <div>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "10px", color: colors.inkMuted, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Vitamin D · 2 readings · nutritional
            </p>
            <TrendChart
              category="nutritional"
              unit="nmol/L"
              optimalLow={100}
              optimalHigh={150}
              labLow={50}
              labHigh={125}
              data={[
                { date: "Aug 24", value: 68 },
                { date: "Jan 25", value: 82 },
              ]}
            />
          </div>

          {/* 1 point — dot only */}
          <div>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "10px", color: colors.inkMuted, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              hs-CRP · 1 reading · inflammation
            </p>
            <TrendChart
              category="inflammation"
              unit="mg/L"
              optimalHigh={0.8}
              labHigh={3.0}
              data={[{ date: "Jan 25", value: 0.6 }]}
            />
          </div>

        </div>
      </Section>

      <Section title="C-10 · Upload Review Row" wide>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "4px 0" }}>
          <UploadReviewRow metricName="LDL Cholesterol" rawName="LDL-C" value={2.8} unit="mmol/L" rowState="confirmed" />
          <UploadReviewRow metricName="Vitamin D" rawName="25-OH Vitamin D" value={82} unit="nmol/L" rowState="review" />
          <UploadReviewRow metricName="Unknown" rawName="APOC3 (unlabelled)" value={14.2} unit="mg/dL" rowState="unmapped" />
        </div>
      </Section>

      <Section title="C-13 · Drop Zone" wide>
        <div style={{ padding: "4px 0" }}>
          <DropZone />
        </div>
      </Section>

      <Section title="C-14 · Annotation — click to edit" wide>
        <div style={{ padding: "8px 0" }}>
          <Annotation value="Tested fasted at 8am. Had a cold the week prior — hs-CRP may be elevated as a result." />
        </div>
        <div style={{ padding: "8px 0" }}>
          <Annotation />
        </div>
      </Section>

      <Section title="C-02 / C-03 · Metric Row — click to expand" wide>
        <MetricRow
          metricKey="ldl_c"
          metricName="LDL-C"
          category="cardiovascular"
          value={241}
          unit="mg/dL"
          badge="act"
          lastTested="15 Jan 2025"
          previousValue={208}
        />
        <MetricRow
          metricKey="hdl_c"
          metricName="HDL-C"
          category="cardiovascular"
          value={64.9}
          unit="mg/dL"
          badge="optimal"
          lastTested="15 Jan 2025"
          previousValue={58}
          annotation="Improved after adding more omega-3 and reducing refined carbs."
        />
        <MetricRow
          metricKey="hs_crp"
          metricName="hs-CRP"
          category="inflammation"
          value={0.6}
          unit="mg/L"
          badge="stable"
          lastTested="15 Jan 2025"
        />
        <MetricRow
          metricKey="haemoglobin"
          metricName="Haemoglobin"
          category="blood"
          value={16.1}
          unit="g/dL"
          badge={null}
          labRange="13.2–17.3"
          labLow={13.2}
          labHigh={17.3}
          lastTested="15 Jan 2025"
        />
        <MetricRow
          metricKey="bilirubin_total"
          metricName="Bilirubin (total)"
          category="blood"
          value={1.5}
          unit="mg/dL"
          badge={null}
          labRange="0.2–1.2"
          labLow={0.2}
          labHigh={1.2}
          lastTested="15 Jan 2025"
        />
      </Section>
    </div>
  );
}
