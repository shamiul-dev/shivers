import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-slate-200 shrink-0" />
            <div className="space-y-2">
              <div className="h-6 w-36 bg-slate-200 rounded" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-3 w-56 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded-xl border border-slate-200/60" />
          </div>

          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded-xl border border-slate-200/60" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-4 w-20 bg-slate-200 rounded" />
          <div className="h-24 w-full bg-slate-100 rounded-xl border border-slate-200/60" />
        </div>

        <div className="pt-4 flex justify-end">
          <div className="h-10 w-32 bg-slate-200 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
