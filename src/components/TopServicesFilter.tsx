"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function createUrlWithParam(searchParams: URLSearchParams, key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    return `/home?${params.toString()}`;
}

export function TopServicesFilter() {
    const searchParams = useSearchParams();
    const topServicesCount = searchParams.get('top_services') ? parseInt(searchParams.get('top_services') as string, 10) : 5;

    return (
        <div className="flex items-center gap-2">
            {[5, 10, 15].map(count => (
                <Button key={count} asChild variant={topServicesCount === count ? "default" : "outline"} size="sm">
                    <Link href={createUrlWithParam(searchParams, 'top_services', String(count))}>
                        Top {count}
                    </Link>
                </Button>
            ))}
        </div>
    );
}
