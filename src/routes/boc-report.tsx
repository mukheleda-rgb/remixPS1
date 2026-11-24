import { createFileRoute } from "@tanstack/react-router";
import BOCReport from "@/components/BOCReport";

export const Route = createFileRoute("/boc-report")({
  component: () => <BOCReport />,
});
