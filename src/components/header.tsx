"use client";

import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { SettingsIcon } from "lucide-react";

export default function Header({
  openKeyDialog,
}: {
  openKeyDialog?: () => void;
}) {
  return (
    <header className="px-4 py-2 flex justify-between items-center border-b border-border">
      <h1 className="text-lg font-medium">
        <Logo />
      </h1>
      <nav className="flex flex-row items-center justify-end gap-1">
        <Button variant="ghost" size="sm" asChild>
          <a
            href="https://www.linkedin.com/in/christian-vivas-468371165/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Chris Vivas
          </a>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a
            href="https://www.instagram.com/chrisvivas.ai/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>
        </Button>
        {process.env.NEXT_PUBLIC_CUSTOM_KEY && openKeyDialog && (
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={openKeyDialog}
          >
            {typeof localStorage !== "undefined" &&
              !localStorage?.getItem("falKey") && (
                <span className="dark:bg-orange-400 bg-orange-600 w-2 h-2 rounded-full absolute top-1 right-1"></span>
              )}
            <SettingsIcon className="w-6 h-6" />
          </Button>
        )}
      </nav>
    </header>
  );
}
