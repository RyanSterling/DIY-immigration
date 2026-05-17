import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { cn } from "~/utils/cn";

interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  rightContent?: React.ReactNode;
  className?: string;
}

export function AccordionSection({
  title,
  children,
  collapsible = true,
  defaultExpanded = false,
  rightContent,
  className,
}: AccordionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const showContent = !collapsible || isExpanded;

  const headerClasses = cn(
    "flex items-center justify-between w-full px-4 py-3 text-left bg-gray-50",
    showContent ? "rounded-t-lg" : "rounded-lg",
    collapsible && "hover:bg-gray-100 transition-colors"
  );

  const Header = collapsible ? "button" : "div";

  return (
    <div className={cn("border border-gray-200 rounded-lg", className)}>
      <Header
        type={collapsible ? "button" : undefined}
        onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
        className={headerClasses}
      >
        <div className="flex items-center gap-2">
          {collapsible && (
            isExpanded ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-500" />
            )
          )}
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {rightContent}
      </Header>

      {showContent && (
        <div className="p-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}
