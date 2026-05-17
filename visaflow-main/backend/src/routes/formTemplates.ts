import { Hono } from "hono";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { requireOrg } from "../middleware/requireOrg.js";
import { eq, isNull, and, or, asc } from "drizzle-orm";
import { generateDownloadUrl } from "../lib/s3/index.js";

// Create app with chained routes for type inference
const app = new Hono()
  // Apply auth to all routes
  .use("*", authMiddleware)
  .use("*", requireOrg)
  // Cache GET responses (templates rarely change)
  .use("*", cacheMiddleware())

  // List all available form templates (metadata only)
  .get("/", async (c) => {
    try {
      const user = c.get("user");

      // Get templates that are global (organizationId is null) or belong to this org
      const templates = await db
        .select({
          id: schema.formTemplates.id,
          formNumber: schema.formTemplates.formNumber,
          title: schema.formTemplates.title,
          revision: schema.formTemplates.revision,
          pdfTemplateUrl: schema.formTemplates.pdfTemplateUrl,
          createdAt: schema.formTemplates.createdAt,
          updatedAt: schema.formTemplates.updatedAt,
        })
        .from(schema.formTemplates)
        .where(
          and(
            or(
              isNull(schema.formTemplates.organizationId),
              eq(schema.formTemplates.organizationId, user.organizationId!)
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
      const formNumber = c.req.param("formNumber");

      // Get template by form number
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

      // Get sections ordered by orderIndex
      const sections = await db
        .select()
        .from(schema.formSections)
        .where(eq(schema.formSections.formTemplateId, template.id))
        .orderBy(asc(schema.formSections.orderIndex));

      // Get all fields for all sections
      const sectionIds = sections.map((s) => s.id);

      // Get fields with their autofill mappings using left join
      const fieldsWithMappings = sectionIds.length > 0
        ? await db
            .select({
              field: schema.formFields,
              autofillMapping: schema.formFieldAutofillMappings,
            })
            .from(schema.formFields)
            .leftJoin(
              schema.formFieldAutofillMappings,
              eq(schema.formFields.id, schema.formFieldAutofillMappings.formFieldId)
            )
            .where(
              or(...sectionIds.map((id) => eq(schema.formFields.formSectionId, id)))
            )
            .orderBy(asc(schema.formFields.orderIndex))
        : [];

      // Group fields by section
      const fieldsBySection: Record<string, typeof fieldsWithMappings> = {};
      for (const item of fieldsWithMappings) {
        const sectionId = item.field.formSectionId;
        if (!fieldsBySection[sectionId]) {
          fieldsBySection[sectionId] = [];
        }
        fieldsBySection[sectionId].push(item);
      }

      // Build pdfFieldMappings and autofillMappings from fields
      const pdfFieldMappings: Record<string, string> = {};
      const autofillMappings: Record<string, string> = {};

      for (const items of Object.values(fieldsBySection)) {
        for (const item of items) {
          // Handle pdfMappings - can be string or object
          const pdfMapping = item.field.pdfMappings as string | Record<string, string> | null;
          if (pdfMapping) {
            if (typeof pdfMapping === "string") {
              pdfFieldMappings[item.field.name] = pdfMapping;
            } else if (typeof pdfMapping === "object") {
              for (const [optionValue, pdfName] of Object.entries(pdfMapping)) {
                pdfFieldMappings[`${item.field.name}:${optionValue}`] = pdfName;
              }
            }
          }

          // Handle autofill mapping
          if (item.autofillMapping) {
            autofillMappings[item.field.name] = item.autofillMapping.canonicalField;
          }
        }
      }

      // Build the steps array (sections with fields in expected format)
      const steps = sections.map((section) => ({
        id: section.sectionKey,
        title: section.title,
        description: section.description,
        fields: (fieldsBySection[section.id] || []).map((item) => {
          const showWhen = item.field.showWhen as { field: string; operator: string; value?: unknown }[] | null;
          const options = item.field.options as { value: string; label: string; disabled?: boolean }[] | null;
          const validationRules = item.field.validationRules as Record<string, unknown> | null;

          return {
            name: item.field.name,
            label: item.field.label,
            type: item.field.fieldType,
            ...(item.field.placeholder && { placeholder: item.field.placeholder }),
            ...(item.field.helpText && { helpText: item.field.helpText }),
            ...(item.field.defaultValue && { defaultValue: item.field.defaultValue }),
            ...(item.field.width && { width: item.field.width }),
            ...(showWhen && showWhen.length > 0 ? { showWhen } : {}),
            ...(options && { options }),
            ...(validationRules?.disabled !== undefined && { disabled: validationRules.disabled }),
            ...(validationRules?.rows !== undefined && { rows: validationRules.rows }),
            ...(validationRules?.allowEmpty !== undefined && { allowEmpty: validationRules.allowEmpty }),
            ...(validationRules?.emptyOptionLabel !== undefined && { emptyOptionLabel: validationRules.emptyOptionLabel }),
            ...(validationRules?.direction !== undefined && { direction: validationRules.direction }),
          };
        }),
      }));

      return c.json({
        id: template.id,
        title: template.title,
        formNumber: template.formNumber,
        revision: template.revision,
        steps,
        pdfFieldMappings,
        autofillMappings,
      });
    } catch (error) {
      console.error("Error getting form template by form number:", error);
      return c.json(
        { error: "Failed to get form template", details: String(error) },
        500
      );
    }
  })

  // Get full template with sections, fields, and autofill mappings
  .get("/:id", async (c) => {
    try {
      const user = c.get("user");
      const templateId = c.req.param("id");

      // Get template
      const [template] = await db
        .select()
        .from(schema.formTemplates)
        .where(
          and(
            eq(schema.formTemplates.id, templateId),
            or(
              isNull(schema.formTemplates.organizationId),
              eq(schema.formTemplates.organizationId, user.organizationId!)
            ),
            isNull(schema.formTemplates.deletedAt)
          )
        )
        .limit(1);

      if (!template) {
        return c.json({ error: "Form template not found" }, 404);
      }

      // Get sections ordered by orderIndex
      const sections = await db
        .select()
        .from(schema.formSections)
        .where(eq(schema.formSections.formTemplateId, templateId))
        .orderBy(asc(schema.formSections.orderIndex));

      // Get all fields for all sections
      const sectionIds = sections.map((s) => s.id);

      // Get fields with their autofill mappings using left join
      const fieldsWithMappings = sectionIds.length > 0
        ? await db
            .select({
              field: schema.formFields,
              autofillMapping: schema.formFieldAutofillMappings,
            })
            .from(schema.formFields)
            .leftJoin(
              schema.formFieldAutofillMappings,
              eq(schema.formFields.id, schema.formFieldAutofillMappings.formFieldId)
            )
            .where(
              or(...sectionIds.map((id) => eq(schema.formFields.formSectionId, id)))
            )
            .orderBy(asc(schema.formFields.orderIndex))
        : [];

      // Group fields by section
      const fieldsBySection: Record<string, typeof fieldsWithMappings> = {};
      for (const item of fieldsWithMappings) {
        const sectionId = item.field.formSectionId;
        if (!fieldsBySection[sectionId]) {
          fieldsBySection[sectionId] = [];
        }
        fieldsBySection[sectionId].push(item);
      }

      // Build the response with nested structure
      const sectionsWithFields = sections.map((section) => ({
        id: section.id,
        sectionKey: section.sectionKey,
        title: section.title,
        description: section.description,
        helpText: section.helpText,
        isRequired: section.isRequired,
        buttonConfig: section.buttonConfig,
        orderIndex: section.orderIndex,
        fields: (fieldsBySection[section.id] || []).map((item) => ({
          id: item.field.id,
          name: item.field.name,
          label: item.field.label,
          fieldType: item.field.fieldType,
          pdfMappings: item.field.pdfMappings,
          placeholder: item.field.placeholder,
          helpText: item.field.helpText,
          options: item.field.options,
          validationRules: item.field.validationRules,
          defaultValue: item.field.defaultValue,
          width: item.field.width,
          isRequired: item.field.isRequired,
          disabled: item.field.disabled,
          hideLabel: item.field.hideLabel,
          className: item.field.className,
          fieldConfig: item.field.fieldConfig,
          orderIndex: item.field.orderIndex,
          showWhen: item.field.showWhen,
          autofillMapping: item.autofillMapping
            ? {
                canonicalField: item.autofillMapping.canonicalField,
                transformationRule: item.autofillMapping.transformationRule,
                fallbackValue: item.autofillMapping.fallbackValue,
              }
            : null,
        })),
      }));

      return c.json({
        id: template.id,
        formNumber: template.formNumber,
        title: template.title,
        revision: template.revision,
        pdfTemplateUrl: template.pdfTemplateUrl,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        sections: sectionsWithFields,
      });
    } catch (error) {
      console.error("Error getting form template:", error);
      return c.json(
        { error: "Failed to get form template", details: String(error) },
        500
      );
    }
  })

  // Get signed URL for blank PDF template (for client-side filling)
  .get("/:id/pdf-template-url", async (c) => {
    try {
      const user = c.get("user");
      const templateId = c.req.param("id");

      // Get template with access control
      const [template] = await db
        .select({
          pdfTemplateUrl: schema.formTemplates.pdfTemplateUrl,
        })
        .from(schema.formTemplates)
        .where(
          and(
            eq(schema.formTemplates.id, templateId),
            or(
              isNull(schema.formTemplates.organizationId),
              eq(schema.formTemplates.organizationId, user.organizationId!)
            ),
            isNull(schema.formTemplates.deletedAt)
          )
        )
        .limit(1);

      if (!template) {
        return c.json({ error: "Form template not found" }, 404);
      }

      if (!template.pdfTemplateUrl) {
        return c.json({ error: "PDF template not configured" }, 404);
      }

      // Generate signed download URL for the blank PDF template
      const signedUrl = await generateDownloadUrl(template.pdfTemplateUrl);

      return c.json({ pdfTemplateUrl: signedUrl });
    } catch (error) {
      console.error("Error getting PDF template URL:", error);
      return c.json(
        { error: "Failed to get PDF template URL", details: String(error) },
        500
      );
    }
  });

export default app;
