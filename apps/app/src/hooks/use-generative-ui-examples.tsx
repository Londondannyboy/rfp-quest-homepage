import { z } from "zod";
import { useTheme } from "@/hooks/use-theme";

// CopiotKit imports
import {
  useComponent,
  useFrontendTool,
  useHumanInTheLoop,
  useDefaultRenderTool,
  useRenderTool,
} from "@copilotkit/react-core/v2";

// Generative UI imports
import { PieChart, PieChartProps } from "@/components/generative-ui/charts/pie-chart";
import { BarChart, BarChartProps } from "@/components/generative-ui/charts/bar-chart";
import { WidgetRenderer, WidgetRendererProps } from "@/components/generative-ui/widget-renderer";

import { MeetingTimePicker } from "@/components/generative-ui/meeting-time-picker";
import { BidDecision } from "@/components/generative-ui/bid-decision";
import { CompanyProfileConfirm } from "@/components/generative-ui/company-profile-confirm";
import { CapabilitySelector } from "@/components/generative-ui/capability-selector";
import { UrlConfirm } from "@/components/generative-ui/url-confirm";
import { SectorSelector } from "@/components/generative-ui/sector-selector";
import { ContractRangeSelector } from "@/components/generative-ui/contract-range-selector";
import { SmeConfirm } from "@/components/generative-ui/sme-confirm";
import { BidOutcomeConfirm } from "@/components/generative-ui/bid-outcome-confirm";
import { ToolReasoning } from "@/components/tool-rendering";
import { PlanCard } from "@/components/generative-ui/plan-card";

export const useGenerativeUIExamples = () => {
  const { theme, setTheme } = useTheme();

  // ------------------
  // 🪁 Frontend Tools: https://docs.copilotkit.ai/langgraph/frontend-actions
  // ------------------
  useFrontendTool({
    name: "toggleTheme",
    description: "Frontend tool for toggling the theme of the app.",
    parameters: z.object({}),
    handler: async () => {
      setTheme(theme === "dark" ? "light" : "dark")
    },
  }, [theme, setTheme]);

  // --------------------------
  // 🪁 Frontend Generative UI: https://docs.copilotkit.ai/langgraph/generative-ui/frontend-tools
  // --------------------------
  useComponent({
    name: "pieChart",
    description: "Controlled Generative UI that displays data as a pie chart.",
    parameters: PieChartProps,
    render: PieChart,
  });

  useComponent({
    name: "barChart",
    description: "Controlled Generative UI that displays data as a bar chart.",
    parameters: BarChartProps,
    render: BarChart,
  });

  // --------------------------
  // 🪁 Widget Renderer: Sandboxed HTML/SVG visualizations
  // --------------------------
  useComponent({
    name: "widgetRenderer",
    description:
      "Renders interactive HTML/SVG visualizations in a sandboxed iframe. " +
      "Use for algorithm visualizations, diagrams, interactive widgets, " +
      "simulations, math plots, and any visual explanation.",
    parameters: WidgetRendererProps,
    render: WidgetRenderer,
  });

  // Tako analytics charts are rendered via agent state (analytics_embed_url)
  // in page.tsx, not via useComponent. See D40.

  // --------------------------
  // 🪁 Plan Visualization: Custom rendering for the planning step
  // --------------------------
  const PlanVisualizationParams = z.object({
    approach: z.string(),
    technology: z.string(),
    key_elements: z.array(z.string()),
  });
  useRenderTool({
    name: "plan_visualization",
    parameters: PlanVisualizationParams,
    render: ({ status, parameters }) => {
      const { key_elements: keyElements, ...rest } = parameters;
      return <PlanCard status={status} keyElements={keyElements} {...rest} />;
    },
  });

  // --------------------------
  // 🪁 Default Tool Rendering: https://docs.copilotkit.ai/langgraph/generative-ui/backend-tools
  // --------------------------
  const ignoredTools = ["generate_form"]
  useDefaultRenderTool({
    render: ({ name, status, parameters }) => {
      if(ignoredTools.includes(name)) return <></>;
      return <ToolReasoning name={name} status={status} args={parameters} />;
    },
  });

  // -------------------------------------
  // 🪁 Frontend-tools - Human-in-the-loop: https://docs.copilotkit.ai/langgraph/human-in-the-loop/frontend-tool-based
  // -------------------------------------
  useHumanInTheLoop({
    name: "scheduleTime",
    description: "Use human-in-the-loop to schedule a meeting with the user.",
    parameters: z.object({
      reasonForScheduling: z.string().describe("Reason for scheduling, very brief - 5 words."),
      meetingDuration: z.number().describe("Duration of the meeting in minutes"),
    }),
    render: ({ respond, status, args }) => {
      return <MeetingTimePicker status={status} respond={respond} {...args} />;
    },
  });

  useHumanInTheLoop({
    name: "analyzeBidDecision",
    description: "Use human-in-the-loop to analyze a tender and get user's bid/no-bid decision.",
    parameters: z.object({
      tenderTitle: z.string().describe("Title of the tender opportunity"),
      buyerName: z.string().describe("Name of the buying organization"),
      tenderValue: z.string().optional().describe("Estimated value of the tender"),
      deadline: z.string().optional().describe("Submission deadline"),
      matchScore: z.number().min(0).max(100).describe("Match score as percentage (0-100)"),
      strengths: z.array(z.string()).describe("List of strengths for this opportunity"),
      risks: z.array(z.string()).describe("List of risks or concerns"),
      recommendation: z.enum(["bid", "no-bid", "review"]).describe("AI recommendation: bid, no-bid, or review"),
    }),
    render: ({ respond, status, args }) => {
      return (
        <BidDecision
          status={status}
          respond={respond}
          tenderTitle={args.tenderTitle || "Tender Opportunity"}
          buyerName={args.buyerName || "Unknown Buyer"}
          tenderValue={args.tenderValue}
          deadline={args.deadline}
          matchScore={args.matchScore || 0}
          strengths={args.strengths || []}
          risks={args.risks || []}
          recommendation={args.recommendation || "review"}
        />
      );
    },
  });

  // --------------------------
  // 🪁 URL Confirmation HITL
  // --------------------------
  useHumanInTheLoop({
    name: "confirmUrl",
    description: "Show URL confirmation card with Yes/Different URL buttons.",
    parameters: z.object({
      url: z.string().describe("The inferred website URL to confirm"),
      companyName: z.string().describe("The company name"),
    }),
    render: ({ respond, status, args }) => {
      return <UrlConfirm status={status} respond={respond} url={args.url || ""} companyName={args.companyName || ""} />;
    },
  });

  // --------------------------
  // 🪁 Sector Selector HITL
  // --------------------------
  useHumanInTheLoop({
    name: "selectSectors",
    description: "Show sector multi-select checklist for user to pick their sectors.",
    parameters: z.object({}),
    render: ({ respond, status }) => {
      return <SectorSelector status={status} respond={respond} />;
    },
  });

  // --------------------------
  // 🪁 Contract Range Selector HITL
  // --------------------------
  useHumanInTheLoop({
    name: "selectContractRange",
    description: "Show contract value range buttons for user to select.",
    parameters: z.object({}),
    render: ({ respond, status }) => {
      return <ContractRangeSelector status={status} respond={respond} />;
    },
  });

  // --------------------------
  // 🪁 SME Status HITL
  // --------------------------
  useHumanInTheLoop({
    name: "confirmSmeStatus",
    description: "Show Yes/No buttons for SME status confirmation.",
    parameters: z.object({}),
    render: ({ respond, status }) => {
      return <SmeConfirm status={status} respond={respond} />;
    },
  });

  // --------------------------
  // 🪁 Company Profile Confirmation HITL
  // --------------------------
  useHumanInTheLoop({
    name: "confirmCompanyProfile",
    description: "Show company profile summary card for user to confirm or edit before saving.",
    parameters: z.object({
      companyName: z.string().describe("Company name"),
      domain: z.string().describe("Company domain/website"),
      description: z.string().describe("Company description"),
      sectors: z.string().describe("Comma-separated sectors"),
      contractRange: z.string().describe("Contract value range e.g. Under £100K"),
      isSme: z.boolean().describe("Whether the company is an SME"),
      certifications: z.string().describe("Certifications and frameworks"),
      capabilities: z.string().describe("Core capabilities from DOS categories"),
      expertise: z.string().describe("Free-text expertise description"),
    }),
    render: ({ respond, status, args }) => {
      return (
        <CompanyProfileConfirm
          status={status}
          respond={respond}
          companyName={args.companyName || ""}
          domain={args.domain || ""}
          description={args.description || ""}
          sectors={args.sectors || ""}
          contractRange={args.contractRange || ""}
          isSme={args.isSme ?? false}
          certifications={args.certifications || ""}
          capabilities={args.capabilities || ""}
          expertise={args.expertise || ""}
        />
      );
    },
  });

  // --------------------------
  // 🪁 DOS Capability Selector HITL
  // --------------------------
  useHumanInTheLoop({
    name: "selectCapabilities",
    description: "Show a checklist of Digital Outcomes capability categories for user to select from.",
    parameters: z.object({
      prompt: z.string().describe("Brief prompt to show above the checklist"),
    }),
    render: ({ respond, status, args }) => {
      return (
        <CapabilitySelector
          status={status}
          respond={respond}
          prompt={args.prompt || "Select your capabilities"}
        />
      );
    },
  });

  // --------------------------
  // 🪁 Bid Outcome Confirmation HITL
  // --------------------------
  useHumanInTheLoop({
    name: "confirmBidOutcome",
    description: "Show bid outcome confirmation card for adding wins/losses to skills graph.",
    parameters: z.object({
      contractName: z.string().describe("Name of the contract or tender"),
      buyer: z.string().describe("Buyer/client organization name"),
      outcome: z.enum(["win", "loss"]).describe("Bid outcome: win or loss"),
      value: z.number().optional().describe("Contract value in GBP"),
      year: z.number().optional().describe("Year of the bid"),
      role: z.string().optional().describe("User's role in the bid"),
    }),
    render: ({ respond, status, args }) => {
      return (
        <BidOutcomeConfirm
          status={status}
          respond={respond}
          contractName={args.contractName || ""}
          buyer={args.buyer || ""}
          outcome={args.outcome || "win"}
          value={args.value}
          year={args.year}
          role={args.role}
        />
      );
    },
  });
};
