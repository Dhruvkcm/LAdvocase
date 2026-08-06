import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "border-destructive/25 bg-destructive/10 text-destructive",
    disposed: "border-success/25 bg-success/10 text-success",
    approved: "border-success/25 bg-success/10 text-success",
    rejected: "border-destructive/25 bg-destructive/10 text-destructive",
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", map[status])}
    >
      {label}
    </Badge>
  );
}
