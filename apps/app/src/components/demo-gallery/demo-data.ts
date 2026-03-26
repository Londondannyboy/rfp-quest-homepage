export type DemoCategory =
  | "3D / Animation"
  | "Data Visualization"
  | "Diagrams"
  | "Interactive"
  | "UI Components";

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
    id: "demo-pitch-roll-yaw",
    title: "Pitch, Roll & Yaw",
    description:
      "Interactive 3D airplane in Three.js explaining pitch, roll, and yaw with control buttons",
    category: "3D / Animation",
    emoji: "✈️",
    prompt:
      "Create a 3D plane in Three.js to explain how pitch, roll, and yaw work. Give me buttons to control each axis. Add labels showing which rotation is which.",
  },
  {
    id: "demo-weather",
    title: "Weather Card",
    description:
      "Current weather conditions with temperature, humidity, wind, and UV index",
    category: "UI Components",
    emoji: "🌤️",
    prompt:
      "Create a beautiful weather card showing current conditions for San Francisco with temperature, humidity, wind speed, UV index, and a 5-day mini forecast.",
  },
  {
    id: "demo-binary-search",
    title: "Binary Search",
    description:
      "Step-by-step visualization of binary search on a sorted array",
    category: "Diagrams",
    emoji: "🔍",
    prompt:
      "Visualize how binary search works on a sorted list. Step by step with animation. Show the high, low, and mid pointers moving.",
  },
  {
    id: "demo-solar-system",
    title: "Solar System",
    description:
      "3D solar system with orbiting planets you can click for facts",
    category: "3D / Animation",
    emoji: "🪐",
    prompt:
      "Build a 3D solar system with orbiting planets using Three.js. Let me click on each planet to see facts about it. Include realistic relative sizes and orbital speeds.",
  },
  {
    id: "demo-dashboard",
    title: "KPI Dashboard",
    description:
      "Quarterly performance dashboard with metrics cards and bar chart",
    category: "Data Visualization",
    emoji: "📊",
    prompt:
      "Create a KPI dashboard showing Q1 2026 performance with revenue, active users, and conversion rate. Include a monthly revenue bar chart and trend indicators.",
  },
  {
    id: "demo-sorting",
    title: "Sorting Comparison",
    description:
      "Animated side-by-side comparison of bubble sort vs quicksort",
    category: "Diagrams",
    emoji: "📶",
    prompt:
      "Create an animated comparison of bubble sort vs quicksort running side by side on the same random array. Add speed controls and a step counter.",
  },
  {
    id: "demo-pomodoro",
    title: "Pomodoro Timer",
    description:
      "Focus timer with circular progress ring, session counter, and controls",
    category: "Interactive",
    emoji: "🍅",
    prompt:
      "Build a Pomodoro timer with a circular progress ring, start/pause/reset buttons, and a session counter. Use 25 min work / 5 min break intervals. Make it look clean and minimal.",
  },
  {
    id: "demo-neural-network",
    title: "Neural Network",
    description:
      "Interactive neural network diagram with animated forward pass",
    category: "Diagrams",
    emoji: "🧠",
    prompt:
      "Visualize a simple neural network with input, hidden, and output layers. Animate the forward pass showing data flowing through the network. Let me adjust the number of neurons per layer.",
  },
  {
    id: "demo-invoice",
    title: "Invoice Card",
    description:
      "Compact invoice card with amount, client info, and action buttons",
    category: "UI Components",
    emoji: "🧾",
    prompt:
      "Create an invoice card showing a monthly billing summary with client name, amount due, invoice number, and send/expand action buttons.",
  },
  {
    id: "demo-music-visualizer",
    title: "Music Equalizer",
    description:
      "Audio equalizer visualization with animated frequency bars and controls",
    category: "3D / Animation",
    emoji: "🎵",
    prompt:
      "Create a music equalizer visualization with animated bars that respond to frequency sliders. Add controls for bass, mid, and treble. Use a gradient color scheme.",
  },
];

export const DEMO_CATEGORIES: DemoCategory[] = [
  "3D / Animation",
  "Data Visualization",
  "Diagrams",
  "Interactive",
  "UI Components",
];
