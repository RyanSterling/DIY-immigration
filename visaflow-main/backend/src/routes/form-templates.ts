import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { requireOrg } from "../middleware/requireOrg.js";
import { requireSuperAdmin } from "../middleware/role.js";
import { eq, isNull, and, or, asc, inArray } from "drizzle-orm";
import { invalidateCache, cacheKeys } from "../lib/redis.js";

// Types for reconstructed FormTemplate shape
interface FieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ConditionalRule {
  field: string;
  operator: "equals" | "notEquals" | "contains" | "isEmpty" | "isNotEmpty";
  value?: string | number | boolean | string[];
}

interface FieldConfig {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  disabled?: boolean;
  width?: "1-1" | "1-2" | "1-3" | "1-4";
  showWhen?: ConditionalRule[];
  options?: FieldOption[];
  rows?: number;
  allowEmpty?: boolean;
  emptyOptionLabel?: string;
  direction?: "horizontal" | "vertical";
}

interface StepConfig {
  id: string;
  title: string;
  description?: string;
  fields: FieldConfig[];
}

interface FormTemplateResponse {
  id: string;
  title: string;
  formNumber: string;
  revision: string | null;
  steps: StepConfig[];
  pdfFieldMappings: Record<string, string>;
  autofillMappings: Record<string, string>;
}

// Validation schemas
const createTemplateSchema = z.object({
  formNumber: z.string().min(1),
  title: z.string().min(1),
  revision: z.string().optional(),
  pdfTemplateUrl: z.string().optional(),
});

const updateTemplateSchema = z.object({
  formNumber: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  revision: z.string().optional(),
  pdfTemplateUrl: z.string().optional(),
});

const createSectionSchema = z.object({
  sectionKey: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  orderIndex: z.number().int().min(0),
});

const createFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  fieldType: z.enum([
    "text",
    "textarea",
    "number",
    "date",
    "select",
    "checkbox",
    "radio",
    "email",
    "phone",
    "file",
  ]),
  pdfFieldId: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
        disabled: z.boolean().optional(),
      })
    )
    .optional(),
  validationRules: z.record(z.string(), z.unknown()).optional(),
  defaultValue: z.string().optional(),
  width: z.enum(["1-1", "1-2", "1-3", "1-4"]).optional(),
  isRequired: z.boolean().optional(),
  orderIndex: z.number().int().min(0),
  showWhen: z
    .array(
      z.object({
        field: z.string(),
        operator: z.enum([
          "equals",
          "notEquals",
          "contains",
          "isEmpty",
          "isNotEmpty",
        ]),
        value: z
          .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
          .optional(),
      })
    )
    .optional(),
});

const createAutofillMappingSchema = z.object({
  canonicalField: z.string().min(1),
  transformationRule: z.string().optional(),
  fallbackValue: z.string().optional(),
});

// Helper function to reconstruct FormTemplate from database
async function reconstructFormTemplate(
  templateId: string
): Promise<FormTemplateResponse | null> {
  // Get template
  const [template] = await db
    .select()
    .from(schema.formTemplates)
    .where(
      and(
        eq(schema.formTemplates.id, templateId),
        isNull(schema.formTemplates.deletedAt)
      )
    )
    .limit(1);

  if (!template) return null;

  // Get sections with fields
  const sections = await db
    .select()
    .from(schema.formSections)
    .where(eq(schema.formSections.formTemplateId, templateId))
    .orderBy(asc(schema.formSections.orderIndex));

  // Get fields for all sections
  const sectionIds = sections.map((s) => s.id);
  const fields =
    sectionIds.length > 0
      ? await db
          .select()
          .from(schema.formFields)
          .where(inArray(schema.formFields.formSectionId, sectionIds))
          .orderBy(asc(schema.formFields.orderIndex))
      : [];

  // Get autofill mappings
  const fieldIds = fields.map((f) => f.id);
  const autofillMappings =
    fieldIds.length > 0
      ? await db
          .select()
          .from(schema.formFieldAutofillMappings)
          .where(inArray(schema.formFieldAutofillMappings.formFieldId, fieldIds))
      : [];

  // Build autofill mappings lookup
  const autofillMappingsLookup = new Map(
    autofillMappings.map((m) => [m.formFieldId, m.canonicalField])
  );

  // Build steps array and pdfFieldMappings
  const pdfFieldMappings: Record<string, string> = {};
  const autofillMap: Record<string, string> = {};

  const steps: StepConfig[] = sections.map((section) => {
    const sectionFields = fields.filter(
      (f) => f.formSectionId === section.id
    );

    const fieldConfigs: FieldConfig[] = sectionFields.map((field) => {
      // Handle pdfMappings - can be string or object
      const pdfMapping = field.pdfMappings as string | Record<string, string> | null;
      if (pdfMapping) {
        if (typeof pdfMapping === "string") {
          pdfFieldMappings[field.name] = pdfMapping;
        } else if (typeof pdfMapping === "object") {
          // For radio/checkbox with option mappings
          for (const [optionValue, pdfName] of Object.entries(pdfMapping)) {
            pdfFieldMappings[`${field.name}:${optionValue}`] = pdfName;
          }
        }
      }

      // Add autofill mapping if exists
      const canonicalField = autofillMappingsLookup.get(field.id);
      if (canonicalField) {
        autofillMap[field.name] = canonicalField;
      }

      // Extract extra properties from options/validationRules JSONB
      const options = field.options as FieldOption[] | null;
      const validationRules = field.validationRules as Record<string, unknown> | null;

      // Parse showWhen from JSONB
      const showWhen = field.showWhen as ConditionalRule[] | null;

      const fieldConfig: FieldConfig = {
        name: field.name,
        label: field.label,
        type: field.fieldType,
        ...(field.placeholder && { placeholder: field.placeholder }),
        ...(field.helpText && { helpText: field.helpText }),
        ...(field.defaultValue && { defaultValue: field.defaultValue }),
        ...(field.width && { width: field.width as "1-1" | "1-2" | "1-3" | "1-4" }),
        ...(showWhen && showWhen.length > 0 ? { showWhen } : {}),
        ...(options && { options }),
        // Extract extra properties from validationRules if present
        ...(validationRules?.disabled !== undefined && { disabled: validationRules.disabled as boolean }),
        ...(validationRules?.rows !== undefined && { rows: validationRules.rows as number }),
        ...(validationRules?.allowEmpty !== undefined && { allowEmpty: validationRules.allowEmpty as boolean }),
        ...(validationRules?.emptyOptionLabel !== undefined && { emptyOptionLabel: validationRules.emptyOptionLabel as string }),
        ...(validationRules?.direction !== undefined && { direction: validationRules.direction as "horizontal" | "vertical" }),
      };

      return fieldConfig;
    });

    return {
      id: section.sectionKey,
      title: section.title,
      ...(section.description && { description: section.description }),
      fields: fieldConfigs,
    };
  });

  return {
    id: template.id,
    title: template.title,
    formNumber: template.formNumber,
    revision: template.revision,
    steps,
    pdfFieldMappings,
    autofillMappings: autofillMap,
  };
}

const app = new Hono()
  .use("*", authMiddleware)
  .use("*", requireOrg)
  .use("*", cacheMiddleware())

  // List all available form templates (global + org-specific)
  .get("/", async (c) => {
    try {
      const user = c.get("user");

      const templates = await db
        .select({
          id: schema.formTemplates.id,
          formNumber: schema.formTemplates.formNumber,
          title: schema.formTemplates.title,
          revision: schema.formTemplates.revision,
          pdfTemplateUrl: schema.formTemplates.pdfTemplateUrl,
          organizationId: schema.formTemplates.organizationId,
          createdAt: schema.formTemplates.createdAt,
        })
        .from(schema.formTemplates)
        .where(
          and(
            or(
              isNull(schema.formTemplates.organizationId), // Global templates
              eq(schema.formTemplates.organizationId, user.organizationId!) // Org-specific
            ),
            isNull(schema.formTemplates.deletedAt)
          )
        )
        .orderBy(asc(schema.formTemplates.formNumber));

      return c.json({ items: templates });
    } catch (error) {
      console.error("Error listing form templates:", error);
      return c.json(
        { error: "Failed to list form templates", details: String(error) },
        500
      );
    }
  })

  // Get template by form number (e.g., "I-765") - must be before /:id to avoid route collision
  .get("/by-form-number/:formNumber", async (c) => {
    try {
      const user = c.get("user");
      const { formNumber } = c.req.param();

      // Find the template
      const [template] = await db
        .select()
        .from(schema.formTemplates)
        .where(
          and(
            eq(schema.formTemplates.formNumber, formNumber),
            or(
              isNull(schema.formTemplates.organizationId),
              eq(schema.formTemplates.organizationId, user.organizationId!)
            ),
            isNull(schema.formTemplates.deletedAt)
          )
        )
        .orderBy(asc(schema.formTemplates.createdAt))
        .limit(1);

      if (!template) {
        return c.json({ error: "Form template not found" }, 404);
      }

      const fullTemplate = await reconstructFormTemplate(template.id);
      return c.json(fullTemplate);
    } catch (error) {
      console.error("Error getting form template by form number:", error);
      return c.json(
        { error: "Failed to get form template", details: String(error) },
        500
      );
    }
  })

  // Get single template with full structure (reconstructed FormTemplate shape)
  .get("/:id", async (c) => {
    try {
      const { id } = c.req.param();

      const template = await reconstructFormTemplate(id);

      if (!template) {
        return c.json({ error: "Form template not found" }, 404);
      }

      return c.json(template);
    } catch (error) {
      console.error("Error getting form template:", error);
      return c.json(
        { error: "Failed to get form template", details: String(error) },
        500
      );
    }
  })

  // Create new template (super admin only for global, org admin for org-specific)
  .post("/", zValidator("json", createTemplateSchema), async (c) => {
    try {
      const user = c.get("user");
      const data = c.req.valid("json");

      // Only super admins can create global templates (null organizationId)
      // Org admins create templates for their organization
      const organizationId =
        user.role === "super_admin" ? null : user.organizationId;

      const [template] = await db
        .insert(schema.formTemplates)
        .values({
          ...data,
          organizationId,
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning();

      await invalidateCache(cacheKeys.all());

      return c.json(template, 201);
    } catch (error) {
      console.error("Error creating form template:", error);
      return c.json(
        { error: "Failed to create form template", details: String(error) },
        500
      );
    }
  })

  // Update template
  .patch("/:id", zValidator("json", updateTemplateSchema), async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();
      const data = c.req.valid("json");

      // Verify template exists and user has access
      const [existing] = await db
        .select()
        .from(schema.formTemplates)
        .where(
          and(
            eq(schema.formTemplates.id, id),
            or(
              isNull(schema.formTemplates.organizationId),
              eq(schema.formTemplates.organizationId, user.organizationId!)
            ),
            isNull(schema.formTemplates.deletedAt)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "Form template not found" }, 404);
      }

      // Only super admins can modify global templates
      if (existing.organizationId === null && user.role !== "super_admin") {
        return c.json(
          { error: "Only super admins can modify global templates" },
          403
        );
      }

      const [updated] = await db
        .update(schema.formTemplates)
        .set({
          ...data,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.formTemplates.id, id))
        .returning();

      await invalidateCache(cacheKeys.all());

      return c.json(updated);
    } catch (error) {
      console.error("Error updating form template:", error);
      return c.json(
        { error: "Failed to update form template", details: String(error) },
        500
      );
    }
  })

  // Soft delete template
  .delete("/:id", async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();

      const [existing] = await db
        .select()
        .from(schema.formTemplates)
        .where(
          and(
            eq(schema.formTemplates.id, id),
            or(
              isNull(schema.formTemplates.organizationId),
              eq(schema.formTemplates.organizationId, user.organizationId!)
            ),
            isNull(schema.formTemplates.deletedAt)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "Form template not found" }, 404);
      }

      // Only super admins can delete global templates
      if (existing.organizationId === null && user.role !== "super_admin") {
        return c.json(
          { error: "Only super admins can delete global templates" },
          403
        );
      }

      await db
        .update(schema.formTemplates)
        .set({
          deletedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(schema.formTemplates.id, id));

      await invalidateCache(cacheKeys.all());

      return c.json({ success: true });
    } catch (error) {
      console.error("Error deleting form template:", error);
      return c.json(
        { error: "Failed to delete form template", details: String(error) },
        500
      );
    }
  })

  // === Section Management ===

  // Add section to template
  .post(
    "/:templateId/sections",
    zValidator("json", createSectionSchema),
    async (c) => {
      try {
        const user = c.get("user");
        const { templateId } = c.req.param();
        const data = c.req.valid("json");

        // Verify template exists
        const [template] = await db
          .select()
          .from(schema.formTemplates)
          .where(
            and(
              eq(schema.formTemplates.id, templateId),
              isNull(schema.formTemplates.deletedAt)
            )
          )
          .limit(1);

        if (!template) {
          return c.json({ error: "Form template not found" }, 404);
        }

        const [section] = await db
          .insert(schema.formSections)
          .values({
            formTemplateId: templateId,
            ...data,
          })
          .returning();

        await invalidateCache(cacheKeys.all());

        return c.json(section, 201);
      } catch (error) {
        console.error("Error creating form section:", error);
        return c.json(
          { error: "Failed to create form section", details: String(error) },
          500
        );
      }
    }
  )

  // === Field Management ===

  // Add field to section
  .post(
    "/:templateId/sections/:sectionId/fields",
    zValidator("json", createFieldSchema),
    async (c) => {
      try {
        const { templateId, sectionId } = c.req.param();
        const data = c.req.valid("json");

        // Verify section exists and belongs to template
        const [section] = await db
          .select()
          .from(schema.formSections)
          .where(
            and(
              eq(schema.formSections.id, sectionId),
              eq(schema.formSections.formTemplateId, templateId)
            )
          )
          .limit(1);

        if (!section) {
          return c.json({ error: "Form section not found" }, 404);
        }

        const [field] = await db
          .insert(schema.formFields)
          .values({
            formSectionId: sectionId,
            ...data,
          })
          .returning();

        await invalidateCache(cacheKeys.all());

        return c.json(field, 201);
      } catch (error) {
        console.error("Error creating form field:", error);
        return c.json(
          { error: "Failed to create form field", details: String(error) },
          500
        );
      }
    }
  )

  // === Autofill Mapping Management ===

  // Add autofill mapping to field
  .post(
    "/:templateId/fields/:fieldId/autofill-mapping",
    zValidator("json", createAutofillMappingSchema),
    async (c) => {
      try {
        const { fieldId } = c.req.param();
        const data = c.req.valid("json");

        // Verify field exists
        const [field] = await db
          .select()
          .from(schema.formFields)
          .where(eq(schema.formFields.id, fieldId))
          .limit(1);

        if (!field) {
          return c.json({ error: "Form field not found" }, 404);
        }

        const [mapping] = await db
          .insert(schema.formFieldAutofillMappings)
          .values({
            formFieldId: fieldId,
            ...data,
          })
          .returning();

        await invalidateCache(cacheKeys.all());

        return c.json(mapping, 201);
      } catch (error) {
        console.error("Error creating autofill mapping:", error);
        return c.json(
          { error: "Failed to create autofill mapping", details: String(error) },
          500
        );
      }
    }
  );

export default app;
