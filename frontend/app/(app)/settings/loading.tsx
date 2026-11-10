import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="border-b border-line-soft bg-gradient-to-r from-background/60 to-surface pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-surface-shade shrink-0" />
            <div className="space-y-2">
              <div className="h-6 w-36 bg-surface-shade rounded" />
              <div className="h-4 w-24 bg-surface-muted rounded" />
              <div className="h-3 w-56 bg-surface-muted rounded" />
            </div>
          </div>
          <div className="h-9 w-28 bg-surface-shade rounded-xl" />
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <div className="h-4 w-28 bg-surface-shade rounded" />
            <div className="h-10 w-full bg-surface-muted rounded-xl border border-line/60" />
          </div>

          <div className="space-y-2">
            <div className="h-4 w-32 bg-surface-shade rounded" />
            <div className="h-10 w-full bg-surface-muted rounded-xl border border-line/60" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-4 w-20 bg-surface-shade rounded" />
          <div className="h-24 w-full bg-surface-muted rounded-xl border border-line/60" />
        </div>

        <div className="pt-4 flex justify-end">
          <div className="h-10 w-32 bg-surface-shade rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
