import { useConfigureSuggestions } from "@copilotkit/react-core/v2";

export const useExampleSuggestions = () => {
  useConfigureSuggestions({
    suggestions: [
      { title: "Recent tenders", message: "Show me recent UK government tenders" },
      { title: "NHS spend by year", message: "Show me NHS contract spend by year" },
      { title: "Analyse a tender", message: "Analyse tender: Service Wing Demolition (RAAC)" },
    ],
    available: "always",
  });
}
