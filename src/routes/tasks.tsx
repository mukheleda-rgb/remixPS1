import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { TasksPanel } from "@/components/TasksPanel";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const { t } = useTranslation();

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("app.tasksTitle")}</h1>
        <p className="text-muted-foreground">{t("app.description")}</p>
      </div>
      <TasksPanel />
    </div>
  );
}
