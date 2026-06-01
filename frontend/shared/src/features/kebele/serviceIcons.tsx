import {
  BadgeCheck,
  FileText,
  Heart,
  IdCard,
  RefreshCw,
  Search,
  Skull,
  type LucideIcon,
} from 'lucide-react';

const ICON_RULES: { match: RegExp; icon: LucideIcon }[] = [
  { match: /marriage|wedding/i, icon: Heart },
  { match: /death|burial/i, icon: Skull },
  { match: /birth/i, icon: FileText },
  { match: /renew/i, icon: RefreshCw },
  { match: /lost|replace/i, icon: Search },
  { match: /new.*id|id.*new/i, icon: IdCard },
  { match: /id|identity/i, icon: BadgeCheck },
];

export function getServiceIcon(name: string): LucideIcon {
  for (const { match, icon } of ICON_RULES) {
    if (match.test(name)) return icon;
  }
  return FileText;
}
