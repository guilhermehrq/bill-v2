import { redirect } from "next/navigation";
import { CategoryTree } from "@/features/categories/category-tree";
import { listCategoriesWithCounts } from "@/features/categories/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Categorias · FinPessoal" };

export default async function CategoriasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nodes = await listCategoriesWithCounts(user.id);

  return (
    <div className="py-4">
      <CategoryTree nodes={nodes} />
    </div>
  );
}
