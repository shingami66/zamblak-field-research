import type { ReactNode } from "react";

type ProjectLtrTokenProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Isolates numeric date/time tokens as LTR inside Arabic RTL layouts.
 * Prefer pure Latin-digit content (e.g. DD/MM/YYYY) from formatters.
 */
export function ProjectLtrToken({ children, className }: ProjectLtrTokenProps) {
  return (
    <bdi dir="ltr" className={className}>
      {children}
    </bdi>
  );
}
