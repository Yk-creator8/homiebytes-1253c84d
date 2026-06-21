import logoAsset from "@/assets/homiebytes-mark.png.asset.json";

export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <img src={logoAsset.url} alt="HomieBytes" className="h-full w-full object-contain" />
    </div>
  );
}

export function LogoWordmark() {
  return (
    <div className="flex items-center gap-2">
      <Logo />
      <div className="leading-none">
        <div className="font-display text-xl font-extrabold tracking-tight">
          <span className="text-foreground">Cloud</span>
          <span className="text-primary">Bites</span>
        </div>
        <div className="text-[10px] font-semibold text-muted-foreground tracking-[0.12em] mt-0.5">
          GOOD FOOD · ANYTIME · ANYWHERE
        </div>
      </div>
    </div>
  );
}
