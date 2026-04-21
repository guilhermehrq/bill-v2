import {
  ArrowRightLeft,
  BarChart3,
  CreditCard,
  Download,
  LayoutDashboard,
  List,
  RefreshCcw,
  Settings,
  Tags,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  phase?: number; // absent = available now; present = placeholder (em breve)
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Dashboard",
    items: [{ title: "Visão geral", href: "/", icon: LayoutDashboard, phase: 2 }],
  },
  {
    label: "Finanças",
    items: [
      { title: "Extrato", href: "/extrato", icon: List, phase: 2 },
      { title: "Contas", href: "/contas", icon: Wallet },
      { title: "Categorias", href: "/categorias", icon: Tags },
      { title: "Cartões", href: "/cartoes", icon: CreditCard, phase: 3 },
      { title: "Investimentos", href: "/investimentos", icon: ArrowRightLeft, phase: 5 },
    ],
  },
  {
    label: "Planejamento",
    items: [
      { title: "Orçamentos", href: "/orcamentos", icon: Target, phase: 4 },
      { title: "Recorrências", href: "/recorrencias", icon: RefreshCcw, phase: 4 },
      { title: "Metas", href: "/metas", icon: TrendingUp, phase: 4 },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Relatórios", href: "/relatorios", icon: BarChart3, phase: 5 },
      { title: "Importar", href: "/importar", icon: Download, phase: 2.5 },
    ],
  },
];

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { title: "Home", href: "/", icon: LayoutDashboard, phase: 2 },
  { title: "Extrato", href: "/extrato", icon: List, phase: 2 },
  { title: "Orçamentos", href: "/orcamentos", icon: Target, phase: 4 },
];

export const SETTINGS_ITEM: NavItem = {
  title: "Configurações",
  href: "/configuracoes",
  icon: Settings,
  phase: 5,
};
