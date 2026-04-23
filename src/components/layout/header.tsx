"use client";

import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function Header({ title, description, children }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <div className="flex items-center gap-4">
        {children}
        {session?.user && (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
              <Badge variant="secondary" className="text-xs">
                {(session.user as { role?: string }).role ?? "STAFF"}
              </Badge>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-medium">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
