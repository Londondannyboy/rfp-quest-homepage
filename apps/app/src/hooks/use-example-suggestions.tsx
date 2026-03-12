import { useConfigureSuggestions } from "@copilotkit/react-core/v2";

export const useExampleSuggestions = () => {
  useConfigureSuggestions({
    suggestions: [
      { title: "Visualize a binary search", message: "Visualize how binary search works on a sorted list. Step by step." },
      { title: "Compare BFS vs DFS", message: "I want to understand the difference between BFS and DFS. Create an interactive comparison on a node graph." },
      { title: "Cool 3D sphere", message: "Create a 3D animation of a sphere turning into an icosahedron when the mouse is on it and back to a sphere when it's not on the icosahedron, make it cool." },
    ],
    available: "always", // Optional: when to show suggestions
  });
}
