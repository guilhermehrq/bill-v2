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
    items: [{ title: "Visão geral", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Finanças",
    items: [
      { title: "Extrato", href: "/extrato", icon: List },
      { title: "Contas", href: "/contas", icon: Wallet },
      { title: "Categorias", href: "/categorias", icon: Tags },
      { title: "Cartões", href: "/cartoes", icon: CreditCard },
      { title: "Investimentos", href: "/investimentos", icon: ArrowRightLeft, phase: 5 },
    ],
  },
  {
    label: "Planejamento",
    items: [
      { title: "Orçamentos", href: "/orcamentos", icon: Target },
      { title: "Recorrências", href: "/recorrencias", icon: RefreshCcw },
      { title: "Metas", href: "/metas", icon: TrendingUp },
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
  { title: "Home", href: "/", icon: LayoutDashboard },
  { title: "Extrato", href: "/extrato", icon: List },
  { title: "Orçamentos", href: "/orcamentos", icon: Target },
];

export const SETTINGS_ITEM: NavItem = {
  title: "Configurações",
  href: "/configuracoes",
  icon: Settings,
};
