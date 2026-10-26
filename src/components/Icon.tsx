import {
  Laptop, RefreshCcw, Mouse, KeyRound, Download, Network, Globe, AppWindow,
  Workflow, ChartColumn, Wrench, Server, type LucideProps,
} from 'lucide-react';
import type { IconName } from '../config/site';

const map = {
  laptop: Laptop, refurb: RefreshCcw, mouse: Mouse, key: KeyRound, download: Download,
  network: Network, web: Globe, app: AppWindow, cog: Workflow, chart: ChartColumn,
  install: Wrench, server: Server,
} satisfies Record<IconName, unknown>;

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const C = map[name];
  return <C aria-hidden="true" strokeWidth={1.75} {...props} />;
}
