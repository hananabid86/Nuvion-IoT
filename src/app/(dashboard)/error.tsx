
"use client"

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center h-full">
        <div className="bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800 text-red-700 dark:text-red-200 rounded-lg p-8 text-center max-w-lg mx-auto">
            <div className="flex justify-center mb-4">
                <div className="h-12 w-12 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                    <AlertTriangle className="h-6 w-6" />
                </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
            <p className="mb-6">
              Something went wrong while trying to load this page. This could be a temporary issue.
            </p>
            <Button
                onClick={() => reset()}
                className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800"
            >
                Try again
            </Button>
        </div>
    </div>
  )
}
