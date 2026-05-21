"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function CustomerSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();

  return (
    <div className="relative max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          startTransition(() => {
            const params = new URLSearchParams(searchParams);
            if (v) params.set("q", v);
            else params.delete("q");
            router.replace(`/customers?${params.toString()}`);
          });
        }}
        placeholder="ค้นหาชื่อหรือเบอร์โทร..."
        className="pl-9"
      />
    </div>
  );
}
