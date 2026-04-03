export type DemoCategory = "Data Visualization";

export interface DemoItem {
  id: string;
  title: string;
  description: string;
  category: DemoCategory;
  emoji: string;
  prompt: string;
}

export const DEMO_EXAMPLES: DemoItem[] = [
  {
    id: "demo-nhs-spend",
    title: "NHS Spend by Year",
    description: "Annual NHS procurement spending trends",
    category: "Data Visualization",
    emoji: "🏥",
    prompt: "Show me NHS contract spend by year",
  },
  {
    id: "demo-recent",
    title: "Recent Tenders",
    description: "Latest UK government procurement opportunities",
    category: "Data Visualization",
    emoji: "📋",
    prompt: "Show me recent UK government tenders",
  },
  {
    id: "demo-construction",
    title: "Construction Contracts",
    description: "Construction sector spending by year",
    category: "Data Visualization",
    emoji: "🏗️",
    prompt: "Show me construction contract spend by year",
  },
  {
    id: "demo-it",
    title: "IT & Digital",
    description: "Technology contract trends",
    category: "Data Visualization",
    emoji: "💻",
    prompt: "Show me IT and digital contract spend by year",
  },
  {
    id: "demo-defence",
    title: "Defence Contracts",
    description: "Defence sector procurement by year",
    category: "Data Visualization",
    emoji: "🛡️",
    prompt: "Show me defence contract spend by year",
  },
  {
    id: "demo-open",
    title: "Open Tenders",
    description: "Contracts currently open for bids",
    category: "Data Visualization",
    emoji: "🟢",
    prompt: "Show me open UK government tenders",
  },
  {
    id: "demo-analyse",
    title: "Analyse a Tender",
    description: "AI bid/no-bid recommendation",
    category: "Data Visualization",
    emoji: "🎯",
    prompt: "Analyse tender: Service Wing Demolition (RAAC)",
  },
  {
    id: "demo-police",
    title: "Police Procurement",
    description: "Police sector contract trends",
    category: "Data Visualization",
    emoji: "👮",
    prompt: "Show me police contract spend by year",
  },
  {
    id: "demo-education",
    title: "Education Contracts",
    description: "Education sector procurement by year",
    category: "Data Visualization",
    emoji: "🎓",
    prompt: "Show me education contract spend by year",
  },
];

export const DEMO_CATEGORIES: DemoCategory[] = ["Data Visualization"];
