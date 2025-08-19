
"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FilterType } from "@/lib/types";

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ElementType;
    color?: string;
    filter: FilterType;
    currentFilter: string;
    setFilter: (filter: FilterType) => void;
}

export function StatCard({ title, value, icon: Icon, color, filter, currentFilter, setFilter }: StatCardProps) {
    return (
        <Card 
            className={cn(
                "cursor-pointer transition-all duration-300",
                "bg-card/60 backdrop-blur-sm border-border/20 hover:border-primary/60",
                "shadow-sm hover:shadow-md hover:shadow-primary/10",
                currentFilter === filter && "border-primary/80 ring-2 ring-primary/20 shadow-lg shadow-primary/10"
            )} 
            onClick={() => setFilter(filter)}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={cn("h-5 w-5 text-muted-foreground", color)} />
            </CardHeader>
            <CardContent>
                <div className={cn("text-3xl font-bold", color)}>{value}</div>
            </CardContent>
        </Card>
    )
}
