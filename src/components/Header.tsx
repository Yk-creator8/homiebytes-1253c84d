import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Menu, ChefHat, Receipt, Home, LogOut, User as UserIcon, LogIn, Heart, Shield, Bike } from "lucide-react";
import { LogoWordmark } from "./Logo";
import { useCart } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth-context";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

const customerNav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/browse", label: "Browse", icon: ShoppingBag },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/orders", label: "Orders", icon: Receipt },
];

const cookNav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/browse", label: "Marketplace", icon: ShoppingBag },
  { to: "/cook", label: "Cook Dashboard", icon: ChefHat },
];

const riderNav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/rider", label: "Deliveries", icon: Bike },
];

const adminNav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/browse", label: "Browse", icon: ShoppingBag },
  { to: "/admin", label: "Admin", icon: Shield },
];

const guestNav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/browse", label: "Browse", icon: ShoppingBag },
];

export function Header() {
  const cart = useCart();
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const nav = !user ? guestNav : role === "admin" ? adminNav : role === "cook" ? cookNav : role === "rider" ? riderNav : customerNav;
  const initials = (profile?.full_name || user?.email || "U").trim().split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

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
          {(role !== "cook" && role !== "admin" && role !== "rider") && (
            <Link to="/cart" className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl bg-secondary hover:bg-secondary/80 transition">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold inline-flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-10 w-10 rounded-xl bg-primary/15 text-primary font-semibold text-sm">{initials}</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium truncate">{profile?.full_name || "Welcome"}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                  {role && <div className="mt-1 inline-block rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase">{role}</div>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {role === "customer" && <DropdownMenuItem asChild><Link to="/orders"><Receipt className="mr-2 h-4 w-4" />My orders</Link></DropdownMenuItem>}
                {role === "cook" && <DropdownMenuItem asChild><Link to="/cook"><ChefHat className="mr-2 h-4 w-4" />Cook dashboard</Link></DropdownMenuItem>}
                {role === "admin" && <DropdownMenuItem asChild><Link to="/admin"><Shield className="mr-2 h-4 w-4" />Admin</Link></DropdownMenuItem>}
                {!role && <DropdownMenuItem asChild><Link to="/onboarding"><UserIcon className="mr-2 h-4 w-4" />Choose role</Link></DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth" className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-warm)]">
              <LogIn className="h-4 w-4" /> Sign in
            </Link>
          )}

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
                    <Link key={n.to} to={n.to} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-secondary">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="font-medium">{n.label}</span>
                    </Link>
                  );
                })}
                {!user && (
                  <Link to="/auth" className="mt-2 flex items-center gap-3 px-3 py-3 rounded-lg bg-primary text-primary-foreground">
                    <LogIn className="h-5 w-5" /><span className="font-medium">Sign in</span>
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
