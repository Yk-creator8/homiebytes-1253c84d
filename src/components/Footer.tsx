import { LogoWordmark } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <LogoWordmark />
          <p className="mt-3 text-sm text-muted-foreground max-w-sm">
            Fresh, homemade meals from neighbourhood cooks. Made with love, delivered with care.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Deligo. All rights reserved.</p>
      </div>
    </footer>
  );
}
