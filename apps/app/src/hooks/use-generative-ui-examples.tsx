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
};
