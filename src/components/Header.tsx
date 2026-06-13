import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingBag, Menu, ChefHat, Receipt, Home } from "lucide-react";
import { LogoWordmark } from "./Logo";
import { useCart } from "@/lib/cart-store";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/browse", label: "Browse", icon: ShoppingBag },
  { to: "/orders", label: "Orders", icon: Receipt },
  { to: "/cook", label: "For Cooks", icon: ChefHat },
];

export function Header() {
  const cart = useCart();
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center"><LogoWordmark /></Link>

        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/cart" className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl bg-secondary hover:bg-secondary/80 transition">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold inline-flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="mt-8 flex flex-col gap-1">
                {nav.map((n) => {
                  const Icon = n.icon;
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-secondary"
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="font-medium">{n.label}</span>
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
