import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-8">
      <div>
        <h3 className="font-serif text-[22px] font-medium leading-tight text-ink">{title}</h3>
        {subtitle && <p className="mt-1.5 font-serif text-[14px] italic text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
