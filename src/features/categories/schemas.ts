import { z } from "zod";

export const categoryTypeEnum = z.enum(["income", "expense"]);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Informe um nome"),
  type: categoryTypeEnum,
  parentId: z.string().uuid().nullable().optional(),
  icon: z.string().trim().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Cor inválida")
    .optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const mergeCategorySchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
});
export type MergeCategoryInput = z.infer<typeof mergeCategorySchema>;
