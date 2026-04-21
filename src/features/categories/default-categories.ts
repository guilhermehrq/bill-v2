// Default pt-BR categories applied during onboarding (prompt §5.2 + §5.6).
// Two-level hierarchy: top-level items are parents, children become subcategories
// with the `parent_id` FK set. Marked `is_system = true` so users cannot delete them.

export type DefaultCategory = {
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  children?: Array<{ name: string; icon: string }>;
};

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  // ─── Receitas ──────────────────────────────────────────────
  {
    name: "Salário",
    type: "income",
    icon: "banknote",
    color: "#10b981",
  },
  {
    name: "Freelance / Bico",
    type: "income",
    icon: "briefcase",
    color: "#10b981",
  },
  {
    name: "Rendimentos",
    type: "income",
    icon: "trending-up",
    color: "#10b981",
  },
  {
    name: "Reembolsos",
    type: "income",
    icon: "rotate-ccw",
    color: "#10b981",
  },
  {
    name: "Presentes recebidos",
    type: "income",
    icon: "gift",
    color: "#10b981",
  },
  {
    name: "Outras receitas",
    type: "income",
    icon: "plus-circle",
    color: "#10b981",
  },

  // ─── Despesas ──────────────────────────────────────────────
  {
    name: "Moradia",
    type: "expense",
    icon: "home",
    color: "#6366f1",
    children: [
      { name: "Aluguel", icon: "key" },
      { name: "Condomínio", icon: "building" },
      { name: "Energia", icon: "zap" },
      { name: "Água", icon: "droplet" },
      { name: "Internet", icon: "wifi" },
      { name: "Gás", icon: "flame" },
      { name: "IPTU", icon: "file-text" },
    ],
  },
  {
    name: "Alimentação",
    type: "expense",
    icon: "utensils",
    color: "#f59e0b",
    children: [
      { name: "Mercado", icon: "shopping-cart" },
      { name: "Restaurante", icon: "utensils-crossed" },
      { name: "Delivery", icon: "bike" },
      { name: "Feira", icon: "apple" },
    ],
  },
  {
    name: "Transporte",
    type: "expense",
    icon: "car",
    color: "#3b82f6",
    children: [
      { name: "Combustível", icon: "fuel" },
      { name: "Uber / 99", icon: "car-taxi-front" },
      { name: "Transporte público", icon: "bus" },
      { name: "Estacionamento", icon: "parking-square" },
      { name: "Manutenção", icon: "wrench" },
      { name: "IPVA & seguro", icon: "file-text" },
    ],
  },
  {
    name: "Saúde",
    type: "expense",
    icon: "heart-pulse",
    color: "#ef4444",
    children: [
      { name: "Plano de saúde", icon: "shield" },
      { name: "Farmácia", icon: "pill" },
      { name: "Consulta médica", icon: "stethoscope" },
      { name: "Academia", icon: "dumbbell" },
    ],
  },
  {
    name: "Lazer",
    type: "expense",
    icon: "smile",
    color: "#8b5cf6",
    children: [
      { name: "Cinema & teatro", icon: "ticket" },
      { name: "Viagens", icon: "plane" },
      { name: "Bares", icon: "beer" },
      { name: "Assinaturas", icon: "tv" },
    ],
  },
  {
    name: "Educação",
    type: "expense",
    icon: "graduation-cap",
    color: "#0ea5e9",
    children: [
      { name: "Cursos", icon: "book-open" },
      { name: "Livros", icon: "book" },
      { name: "Material", icon: "pencil" },
    ],
  },
  {
    name: "Compras",
    type: "expense",
    icon: "shopping-bag",
    color: "#ec4899",
    children: [
      { name: "Vestuário", icon: "shirt" },
      { name: "Eletrônicos", icon: "laptop" },
      { name: "Casa & decoração", icon: "lamp" },
    ],
  },
  {
    name: "Pessoal",
    type: "expense",
    icon: "user",
    color: "#14b8a6",
    children: [
      { name: "Cuidados pessoais", icon: "scissors" },
      { name: "Presentes dados", icon: "gift" },
    ],
  },
  {
    name: "Impostos & taxas",
    type: "expense",
    icon: "receipt",
    color: "#64748b",
  },
  {
    name: "Outros",
    type: "expense",
    icon: "more-horizontal",
    color: "#94a3b8",
  },
];

// Flat count for sanity: ~40 entries (6 receitas + 10 parents + ~28 children).
