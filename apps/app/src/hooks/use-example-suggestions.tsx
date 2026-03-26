import { useConfigureSuggestions } from "@copilotkit/react-core/v2";

export const useExampleSuggestions = () => {
  useConfigureSuggestions({
    suggestions: [
      { title: "Visualize a car axle", message: "Visualize how a car axle works" },
      { title: "3D Plane Controls", message: "Create a 3D plane in Three.js to explain how pitch, roll, and yaw work with buttons that animate on hover." },
      { title: "Cool 3D sphere", message: "Create a 3D animation of a sphere turning into an icosahedron when the mouse is on it and back to a sphere when it's not on the icosahedron, make it cool." },
    ],
    available: "always", // Optional: when to show suggestions
  });
}
