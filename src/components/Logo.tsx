import logoAsset from "@/assets/deligo-logo.png.asset.json";

export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <img src={logoAsset.url} alt="Deligo" className="h-full w-full object-contain" />
    </div>
  );
}

export function LogoWordmark() {
  return (
    <div className="flex items-center gap-2">
      <Logo />
      <div className="leading-none">
        <div className="font-display text-xl font-bold tracking-tight">
          <span className="text-foreground">Deli</span>
          <span className="text-primary">go</span>
        </div>
        <div className="text-[10px] text-muted-foreground tracking-wide mt-0.5">delight on the go</div>
      </div>
    </div>
  );
}
