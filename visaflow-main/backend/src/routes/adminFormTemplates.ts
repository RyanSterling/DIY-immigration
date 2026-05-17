import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireSuperAdmin } from "../middleware/role.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { eq, isNull, and, or, asc, sql, ilike } from "drizzle-orm";
import { invalidateCache, cacheKeys } from "../lib/redis.js";
import {
  generateFormTemplateKey,
  generateUploadUrl,
  generateDownloadUrl,
} from "../lib/s3/index.js";

// Field type enum values
const fieldTypeEnum = z.enum([
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
]);

// Autofill mapping schema
const autofillMappingSchema = z
  .object({
    canonicalField: z.string().min(1),
    transformationRule: z.string().nullable().optional(),
    fallbackValue: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

// Field schema for creation/update
const fieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  fieldType: fieldTypeEnum,
  pdfMappings: z.any().nullable().optional(),
  placeholder: z.string().nullable().optional(),
  helpText: z.string().nullable().optional(),
  options: z.any().nullable().optional(),
  validationRules: z.any().nullable().optional(),
  defaultValue: z.string().nullable().optional(),
  width: z.string().nullable().optional(),
  isRequired: z.boolean().optional().default(false),
  disabled: z.boolean().optional().default(false),
  hideLabel: z.boolean().optional().default(false),
  className: z.string().nullable().optional(),
  fieldConfig: z.any().nullable().optional(),
  orderIndex: z.number().int(),
  showWhen: z.any().nullable().optional(),
  autofillMapping: autofillMappingSchema,
});

// Section schema for creation/update
const sectionSchema = z.object({
  sectionKey: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  helpText: z.string().nullable().optional(),
  isRequired: z.boolean().optional().default(false),
  buttonConfig: z.any().nullable().optional(),
  orderIndex: z.number().int(),
  fields: z.array(fieldSchema).optional(),
});

// Template metadata schema
const templateMetadataSchema = z.object({
  formNumber: z.string().min(1),
  title: z.string().min(1),
  revision: z.string().nullable().optional(),
  pdfTemplateUrl: z.string().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
});

// Full template creation schema
const createTemplateSchema = templateMetadataSchema.extend({
  sections: z.array(sectionSchema).optional(),
});

// Template update schema (TODO: use for template PATCH endpoint)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _updateTemplateSchema = z.object({
  formNumber: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  revision: z.string().nullable().optional(),
  pdfTemplateUrl: z.string().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
});
void _updateTemplateSchema; // Suppress unused variable warning

// Section update schema
const updateSectionSchema = z.object({
  sectionKey: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  helpText: z.string().nullable().optional(),
  isRequired: z.boolean().optional(),
  buttonConfig: z.any().nullable().optional(),
  orderIndex: z.number().int().optional(),
});

// Field update schema
const updateFieldSchema = z.object({
  name: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  fieldType: fieldTypeEnum.optional(),
  pdfMappings: z.any().nullable().optional(),
  placeholder: z.string().nullable().optional(),
  helpText: z.string().nullable().optional(),
  options: z.any().nullable().optional(),
  validationRules: z.any().nullable().optional(),
  defaultValue: z.string().nullable().optional(),
  width: z.string().nullable().optional(),
  isRequired: z.boolean().optional(),
  disabled: z.boolean().optional(),
  hideLabel: z.boolean().optional(),
  className: z.string().nullable().optional(),
  fieldConfig: z.any().nullable().optional(),
  orderIndex: z.number().int().optional(),
  showWhen: z.any().nullable().optional(),
  autofillMapping: autofillMappingSchema,
});

// Field schema for full template save (with id and _deleted for existing fields)
const fullSaveFieldSchema = z.object({
  id: z.string().uuid().optional(), // Present for existing fields
  _deleted: z.boolean().optional(), // True to mark for deletion
  name: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  fieldType: fieldTypeEnum.optional(),
  pdfMappings: z.any().nullable().optional(),
  placeholder: z.string().nullable().optional(),
  helpText: z.string().nullable().optional(),
  options: z.any().nullable().optional(),
  validationRules: z.any().nullable().optional(),
  defaultValue: z.string().nullable().optional(),
  width: z.string().nullable().optional(),
  isRequired: z.boolean().optional(),
  disabled: z.boolean().optional(),
  hideLabel: z.boolean().optional(),
  className: z.string().nullable().optional(),
  fieldConfig: z.any().nullable().optional(),
  orderIndex: z.number().int().optional(),
  showWhen: z.any().nullable().optional(),
  autofillMapping: autofillMappingSchema,
});

// Section schema for full template save (with id and _deleted for existing sections)
const fullSaveSectionSchema = z.object({
  id: z.string().uuid().optional(), // Present for existing sections
  _deleted: z.boolean().optional(), // True to mark for deletion
  sectionKey: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  helpText: z.string().nullable().optional(),
  isRequired: z.boolean().optional(),
  buttonConfig: z.any().nullable().optional(),
  orderIndex: z.number().int().optional(),
  fields: z.array(fullSaveFieldSchema).optional(),
});

// Full template update schema with nested sections and fields
const fullUpdateTemplateSchema = z.object({
  formNumber: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  revision: z.string().nullable().optional(),
  pdfTemplateUrl: z.string().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
  sections: z.array(fullSaveSectionSchema).optional(),
});

// Reorder schema
const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      orderIndex: z.number().int(),
    })
  ),
});

// Create app with chained routes for type inference
const app = new Hono()
  // Apply auth to all routes
  .use("*", authMiddleware)
  .use("*", requireSuperAdmin)
  .use("*", cacheMiddleware())

  // List all templates (paginated, with search)
  .get("/", async (c) => {
    try {
      const page = parseInt(c.req.query("page") || "1");
      const pageSize = parseInt(c.req.query("pageSize") || "20");
      const search = c.req.query("search");
      const organizationId = c.req.query("organizationId");
      const offset = (page - 1) * pageSize;

      // Build where clause
      let whereClause = isNull(schema.formTemplates.deletedAt);

      if (organizationId === "null") {
        // Global templates only
        whereClause = and(
          whereClause,
          isNull(schema.formTemplates.organizationId)
        )!;
      } else if (organizationId) {
        // Specific organization
        whereClause = and(
          whereClause,
          eq(schema.formTemplates.organizationId, organizationId)
        )!;
      }

      if (search) {
        whereClause = and(
          whereClause,
          or(
            ilike(schema.formTemplates.formNumber, `%${search}%`),
            ilike(schema.formTemplates.title, `%${search}%`)
          )
        )!;
      }

      const [templates, countResult] = await Promise.all([
        db
          .select({
            id: schema.formTemplates.id,
            organizationId: schema.formTemplates.organizationId,
            formNumber: schema.formTemplates.formNumber,
            title: schema.formTemplates.title,
            revision: schema.formTemplates.revision,
            pdfTemplateUrl: schema.formTemplates.pdfTemplateUrl,
            createdAt: schema.formTemplates.createdAt,
            updatedAt: schema.formTemplates.updatedAt,
          })
          .from(schema.formTemplates)
          .where(whereClause)
          .limit(pageSize)
          .offset(offset)
          .orderBy(asc(schema.formTemplates.formNumber)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.formTemplates)
          .where(whereClause),
      ]);

      // Get section and field counts for each template
      const templateIds = templates.map((t) => t.id);
      const sectionCounts =
        templateIds.length > 0
          ? await db
              .select({
                formTemplateId: schema.formSections.formTemplateId,
                count: sql<number>`count(*)::int`,
              })
              .from(schema.formSections)
              .where(
                sql`${schema.formSections.formTemplateId} IN (${sql.join(
                  templateIds.map((id) => sql`${id}`),
                  sql`, `
                )})`
              )
              .groupBy(schema.formSections.formTemplateId)
          : [];

      const sectionCountMap = new Map(
        sectionCounts.map((s) => [s.formTemplateId, s.count])
      );

      const templatesWithCounts = templates.map((template) => ({
        ...template,
        sectionCount: sectionCountMap.get(template.id) ?? 0,
      }));

      const total = countResult[0]?.count ?? 0;

      return c.json({
        data: templatesWithCounts,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      console.error("Error listing form templates:", error);
      return c.json(
        { error: "Failed to list form templates", details: String(error) },
        500
      );
    }
  })

  // Create full template with sections and fields
  .post("/", zValidator("json", createTemplateSchema), async (c) => {
    try {
      const user = c.get("user");
      const data = c.req.valid("json");

      // Use transaction for nested creates
      const result = await db.transaction(async (tx) => {
        // Create template
        const [template] = await tx
          .insert(schema.formTemplates)
          .values({
            organizationId: data.organizationId ?? null,
            formNumber: data.formNumber,
            title: data.title,
            revision: data.revision ?? null,
            pdfTemplateUrl: data.pdfTemplateUrl ?? null,
            createdBy: user.id,
            updatedBy: user.id,
          })
          .returning();

        // Create sections and fields if provided
        const sectionsWithFields = [];
        if (data.sections && data.sections.length > 0) {
          for (const sectionData of data.sections) {
            const [section] = await tx
              .insert(schema.formSections)
              .values({
                formTemplateId: template.id,
                sectionKey: sectionData.sectionKey,
                title: sectionData.title,
                description: sectionData.description ?? null,
                helpText: sectionData.helpText ?? null,
                isRequired: sectionData.isRequired ?? false,
                buttonConfig: sectionData.buttonConfig ?? null,
                orderIndex: sectionData.orderIndex,
              })
              .returning();

            const fieldsWithMappings = [];
            if (sectionData.fields && sectionData.fields.length > 0) {
              for (const fieldData of sectionData.fields) {
                const [field] = await tx
                  .insert(schema.formFields)
                  .values({
                    formSectionId: section.id,
                    name: fieldData.name,
                    label: fieldData.label,
                    fieldType: fieldData.fieldType,
                    pdfMappings: fieldData.pdfMappings ?? null,
                    placeholder: fieldData.placeholder ?? null,
                    helpText: fieldData.helpText ?? null,
                    options: fieldData.options ?? null,
                    validationRules: fieldData.validationRules ?? null,
                    defaultValue: fieldData.defaultValue ?? null,
                    width: fieldData.width ?? null,
                    isRequired: fieldData.isRequired ?? false,
                    disabled: fieldData.disabled ?? false,
                    hideLabel: fieldData.hideLabel ?? false,
                    className: fieldData.className ?? null,
                    fieldConfig: fieldData.fieldConfig ?? null,
                    orderIndex: fieldData.orderIndex,
                    showWhen: fieldData.showWhen ?? null,
                  })
                  .returning();

                let autofillMapping = null;
                if (fieldData.autofillMapping?.canonicalField) {
                  const [mapping] = await tx
                    .insert(schema.formFieldAutofillMappings)
                    .values({
                      formFieldId: field.id,
                      canonicalField: fieldData.autofillMapping.canonicalField,
                      transformationRule:
                        fieldData.autofillMapping.transformationRule ?? null,
                      fallbackValue:
                        fieldData.autofillMapping.fallbackValue ?? null,
                    })
                    .returning();
                  autofillMapping = mapping;
                }

                fieldsWithMappings.push({ ...field, autofillMapping });
              }
            }

            sectionsWithFields.push({ ...section, fields: fieldsWithMappings });
          }
        }

        return { ...template, sections: sectionsWithFields };
      });

      await invalidateCache(cacheKeys.all());

      return c.json({ data: result }, 201);
    } catch (error) {
      console.error("Error creating form template:", error);
      return c.json(
        { error: "Failed to create form template", details: String(error) },
        500
      );
    }
  })

  // Get template with sections and fields
  .get("/:id", async (c) => {
    try {
      const templateId = c.req.param("id");

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

      // Get fields with their autofill mappings
      const fieldsWithMappings =
        sectionIds.length > 0
          ? await db
              .select({
                field: schema.formFields,
                autofillMapping: schema.formFieldAutofillMappings,
              })
              .from(schema.formFields)
              .leftJoin(
                schema.formFieldAutofillMappings,
                eq(
                  schema.formFields.id,
                  schema.formFieldAutofillMappings.formFieldId
                )
              )
              .where(
                or(
                  ...sectionIds.map((id) =>
                    eq(schema.formFields.formSectionId, id)
                  )
                )
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
        createdAt: section.createdAt,
        updatedAt: section.updatedAt,
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
          createdAt: item.field.createdAt,
          updatedAt: item.field.updatedAt,
          autofillMapping: item.autofillMapping
            ? {
                id: item.autofillMapping.id,
                canonicalField: item.autofillMapping.canonicalField,
                transformationRule: item.autofillMapping.transformationRule,
                fallbackValue: item.autofillMapping.fallbackValue,
              }
            : null,
        })),
      }));

      return c.json({
        data: {
          id: template.id,
          organizationId: template.organizationId,
          formNumber: template.formNumber,
          title: template.title,
          revision: template.revision,
          pdfTemplateUrl: template.pdfTemplateUrl,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
          createdBy: template.createdBy,
          updatedBy: template.updatedBy,
          sections: sectionsWithFields,
        },
      });
    } catch (error) {
      console.error("Error getting form template:", error);
      return c.json(
        { error: "Failed to get form template", details: String(error) },
        500
      );
    }
  })

  // Update template with optional nested sections and fields
  .patch("/:id", zValidator("json", fullUpdateTemplateSchema), async (c) => {
    try {
      const user = c.get("user");
      const templateId = c.req.param("id");
      const data = c.req.valid("json");

      // Check if template exists
      const [existing] = await db
        .select()
        .from(schema.formTemplates)
        .where(
          and(
            eq(schema.formTemplates.id, templateId),
            isNull(schema.formTemplates.deletedAt)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "Form template not found" }, 404);
      }

      const { sections: sectionsData, ...templateData } = data;

      // Use a transaction for the entire operation
      const result = await db.transaction(async (tx) => {
        // Step 1: Update template metadata (if any fields provided)
        let updatedTemplate = existing;
        if (Object.keys(templateData).length > 0) {
          const [updated] = await tx
            .update(schema.formTemplates)
            .set({
              ...templateData,
              updatedAt: new Date(),
              updatedBy: user.id,
            })
            .where(eq(schema.formTemplates.id, templateId))
            .returning();
          updatedTemplate = updated;
        } else {
          // Just update the timestamp
          const [updated] = await tx
            .update(schema.formTemplates)
            .set({
              updatedAt: new Date(),
              updatedBy: user.id,
            })
            .where(eq(schema.formTemplates.id, templateId))
            .returning();
          updatedTemplate = updated;
        }

        // If no sections data provided, just return template with existing sections/fields
        if (!sectionsData) {
          // Fetch existing sections and fields for response
          const existingSections = await tx
            .select()
            .from(schema.formSections)
            .where(eq(schema.formSections.formTemplateId, templateId))
            .orderBy(asc(schema.formSections.orderIndex));

          const sectionIds = existingSections.map((s) => s.id);
          const fieldsWithMappings =
            sectionIds.length > 0
              ? await tx
                  .select({
                    field: schema.formFields,
                    autofillMapping: schema.formFieldAutofillMappings,
                  })
                  .from(schema.formFields)
                  .leftJoin(
                    schema.formFieldAutofillMappings,
                    eq(
                      schema.formFields.id,
                      schema.formFieldAutofillMappings.formFieldId
                    )
                  )
                  .where(
                    or(
                      ...sectionIds.map((id) =>
                        eq(schema.formFields.formSectionId, id)
                      )
                    )
                  )
                  .orderBy(asc(schema.formFields.orderIndex))
              : [];

          return { template: updatedTemplate, sections: existingSections, fieldsWithMappings };
        }

        // Step 2: Process sections - separate by operation type
        const sectionsToDelete = sectionsData.filter((s) => s._deleted && s.id);
        const existingSectionsToUpdate = sectionsData.filter((s) => s.id && !s._deleted);
        const newSections = sectionsData.filter((s) => !s.id && !s._deleted);

        // Step 2a: Delete sections marked with _deleted (cascade deletes their fields)
        for (const section of sectionsToDelete) {
          await tx
            .delete(schema.formSections)
            .where(eq(schema.formSections.id, section.id!));
        }

        // Step 2b: For existing sections, collect fields to delete first
        for (const section of existingSectionsToUpdate) {
          if (section.fields) {
            const fieldsToDelete = section.fields.filter((f) => f._deleted && f.id);
            for (const field of fieldsToDelete) {
              // Autofill mappings cascade delete with field
              await tx
                .delete(schema.formFields)
                .where(eq(schema.formFields.id, field.id!));
            }
          }
        }

        // Step 2c: Update existing sections
        for (const section of existingSectionsToUpdate) {
          const { id, _deleted, fields, ...sectionUpdateData } = section;
          if (Object.keys(sectionUpdateData).length > 0) {
            await tx
              .update(schema.formSections)
              .set({
                ...sectionUpdateData,
                updatedAt: new Date(),
              })
              .where(eq(schema.formSections.id, id!));
          }
        }

        // Step 2d: Update existing fields within sections
        for (const section of existingSectionsToUpdate) {
          if (section.fields) {
            const existingFieldsToUpdate = section.fields.filter((f) => f.id && !f._deleted);
            for (const field of existingFieldsToUpdate) {
              const { id, _deleted, autofillMapping, ...fieldUpdateData } = field;

              if (Object.keys(fieldUpdateData).length > 0) {
                await tx
                  .update(schema.formFields)
                  .set({
                    ...fieldUpdateData,
                    updatedAt: new Date(),
                  })
                  .where(eq(schema.formFields.id, id!));
              }

              // Handle autofill mapping (delete and recreate pattern)
              if (autofillMapping !== undefined) {
                // Delete existing mapping
                await tx
                  .delete(schema.formFieldAutofillMappings)
                  .where(eq(schema.formFieldAutofillMappings.formFieldId, id!));

                // Create new mapping if provided
                if (autofillMapping?.canonicalField) {
                  await tx.insert(schema.formFieldAutofillMappings).values({
                    formFieldId: id!,
                    canonicalField: autofillMapping.canonicalField,
                    transformationRule: autofillMapping.transformationRule ?? null,
                    fallbackValue: autofillMapping.fallbackValue ?? null,
                  });
                }
              }
            }

            // Step 2e: Create new fields in existing sections
            const newFieldsInSection = section.fields.filter((f) => !f.id && !f._deleted);
            for (const field of newFieldsInSection) {
              const { id: _id, _deleted: _del, autofillMapping, ...fieldData } = field;

              // Validate required fields for new field
              if (!fieldData.name || !fieldData.label || !fieldData.fieldType || fieldData.orderIndex === undefined) {
                throw new Error(`New field missing required properties: name, label, fieldType, and orderIndex are required`);
              }

              const [newField] = await tx
                .insert(schema.formFields)
                .values({
                  formSectionId: section.id!,
                  name: fieldData.name,
                  label: fieldData.label,
                  fieldType: fieldData.fieldType,
                  pdfMappings: fieldData.pdfMappings ?? null,
                  placeholder: fieldData.placeholder ?? null,
                  helpText: fieldData.helpText ?? null,
                  options: fieldData.options ?? null,
                  validationRules: fieldData.validationRules ?? null,
                  defaultValue: fieldData.defaultValue ?? null,
                  width: fieldData.width ?? null,
                  isRequired: fieldData.isRequired ?? false,
                  disabled: fieldData.disabled ?? false,
                  hideLabel: fieldData.hideLabel ?? false,
                  className: fieldData.className ?? null,
                  fieldConfig: fieldData.fieldConfig ?? null,
                  orderIndex: fieldData.orderIndex,
                  showWhen: fieldData.showWhen ?? null,
                })
                .returning();

              // Create autofill mapping if provided
              if (autofillMapping?.canonicalField) {
                await tx.insert(schema.formFieldAutofillMappings).values({
                  formFieldId: newField.id,
                  canonicalField: autofillMapping.canonicalField,
                  transformationRule: autofillMapping.transformationRule ?? null,
                  fallbackValue: autofillMapping.fallbackValue ?? null,
                });
              }
            }
          }
        }

        // Step 2f: Create new sections with their nested fields
        for (const section of newSections) {
          const { id: _id, _deleted, fields, ...sectionData } = section;

          // Validate required fields for new section
          if (!sectionData.sectionKey || !sectionData.title || sectionData.orderIndex === undefined) {
            throw new Error(`New section missing required properties: sectionKey, title, and orderIndex are required`);
          }

          const [newSection] = await tx
            .insert(schema.formSections)
            .values({
              formTemplateId: templateId,
              sectionKey: sectionData.sectionKey,
              title: sectionData.title,
              description: sectionData.description ?? null,
              helpText: sectionData.helpText ?? null,
              isRequired: sectionData.isRequired ?? false,
              buttonConfig: sectionData.buttonConfig ?? null,
              orderIndex: sectionData.orderIndex,
            })
            .returning();

          // Create fields for the new section
          if (fields) {
            const fieldsToCreate = fields.filter((f) => !f._deleted);
            for (const field of fieldsToCreate) {
              const { id: _fieldId, _deleted: _fieldDel, autofillMapping, ...fieldData } = field;

              // Validate required fields for new field
              if (!fieldData.name || !fieldData.label || !fieldData.fieldType || fieldData.orderIndex === undefined) {
                throw new Error(`New field missing required properties: name, label, fieldType, and orderIndex are required`);
              }

              const [newField] = await tx
                .insert(schema.formFields)
                .values({
                  formSectionId: newSection.id,
                  name: fieldData.name,
                  label: fieldData.label,
                  fieldType: fieldData.fieldType,
                  pdfMappings: fieldData.pdfMappings ?? null,
                  placeholder: fieldData.placeholder ?? null,
                  helpText: fieldData.helpText ?? null,
                  options: fieldData.options ?? null,
                  validationRules: fieldData.validationRules ?? null,
                  defaultValue: fieldData.defaultValue ?? null,
                  width: fieldData.width ?? null,
                  isRequired: fieldData.isRequired ?? false,
                  disabled: fieldData.disabled ?? false,
                  hideLabel: fieldData.hideLabel ?? false,
                  className: fieldData.className ?? null,
                  fieldConfig: fieldData.fieldConfig ?? null,
                  orderIndex: fieldData.orderIndex,
                  showWhen: fieldData.showWhen ?? null,
                })
                .returning();

              // Create autofill mapping if provided
              if (autofillMapping?.canonicalField) {
                await tx.insert(schema.formFieldAutofillMappings).values({
                  formFieldId: newField.id,
                  canonicalField: autofillMapping.canonicalField,
                  transformationRule: autofillMapping.transformationRule ?? null,
                  fallbackValue: autofillMapping.fallbackValue ?? null,
                });
              }
            }
          }
        }

        // Fetch final state for response
        const finalSections = await tx
          .select()
          .from(schema.formSections)
          .where(eq(schema.formSections.formTemplateId, templateId))
          .orderBy(asc(schema.formSections.orderIndex));

        const finalSectionIds = finalSections.map((s) => s.id);
        const finalFieldsWithMappings =
          finalSectionIds.length > 0
            ? await tx
                .select({
                  field: schema.formFields,
                  autofillMapping: schema.formFieldAutofillMappings,
                })
                .from(schema.formFields)
                .leftJoin(
                  schema.formFieldAutofillMappings,
                  eq(
                    schema.formFields.id,
                    schema.formFieldAutofillMappings.formFieldId
                  )
                )
                .where(
                  or(
                    ...finalSectionIds.map((id) =>
                      eq(schema.formFields.formSectionId, id)
                    )
                  )
                )
                .orderBy(asc(schema.formFields.orderIndex))
            : [];

        return { template: updatedTemplate, sections: finalSections, fieldsWithMappings: finalFieldsWithMappings };
      });

      await invalidateCache(cacheKeys.all());

      // Build the response with nested structure (matching GET endpoint)
      const fieldsBySection: Record<string, typeof result.fieldsWithMappings> = {};
      for (const item of result.fieldsWithMappings) {
        const sectionId = item.field.formSectionId;
        if (!fieldsBySection[sectionId]) {
          fieldsBySection[sectionId] = [];
        }
        fieldsBySection[sectionId].push(item);
      }

      const sectionsWithFields = result.sections.map((section) => ({
        id: section.id,
        sectionKey: section.sectionKey,
        title: section.title,
        description: section.description,
        helpText: section.helpText,
        isRequired: section.isRequired,
        buttonConfig: section.buttonConfig,
        orderIndex: section.orderIndex,
        createdAt: section.createdAt,
        updatedAt: section.updatedAt,
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
          createdAt: item.field.createdAt,
          updatedAt: item.field.updatedAt,
          autofillMapping: item.autofillMapping
            ? {
                id: item.autofillMapping.id,
                canonicalField: item.autofillMapping.canonicalField,
                transformationRule: item.autofillMapping.transformationRule,
                fallbackValue: item.autofillMapping.fallbackValue,
              }
            : null,
        })),
      }));

      return c.json({
        data: {
          id: result.template.id,
          organizationId: result.template.organizationId,
          formNumber: result.template.formNumber,
          title: result.template.title,
          revision: result.template.revision,
          pdfTemplateUrl: result.template.pdfTemplateUrl,
          createdAt: result.template.createdAt,
          updatedAt: result.template.updatedAt,
          createdBy: result.template.createdBy,
          updatedBy: result.template.updatedBy,
          sections: sectionsWithFields,
        },
      });
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
      const templateId = c.req.param("id");

      // Check if template exists
      const [existing] = await db
        .select()
        .from(schema.formTemplates)
        .where(
          and(
            eq(schema.formTemplates.id, templateId),
            isNull(schema.formTemplates.deletedAt)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "Form template not found" }, 404);
      }

      // Check if template is in use
      const [instanceCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.formInstances)
        .where(
          and(
            eq(schema.formInstances.formTemplateId, templateId),
            isNull(schema.formInstances.deletedAt)
          )
        );

      if (instanceCount.count > 0) {
        return c.json(
          {
            error: "Cannot delete template that is in use",
            instanceCount: instanceCount.count,
          },
          400
        );
      }

      const [deleted] = await db
        .update(schema.formTemplates)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(schema.formTemplates.id, templateId))
        .returning();

      await invalidateCache(cacheKeys.all());

      return c.json({ data: deleted });
    } catch (error) {
      console.error("Error deleting form template:", error);
      return c.json(
        { error: "Failed to delete form template", details: String(error) },
        500
      );
    }
  })

  // Add section to template
  .post(
    "/:id/sections",
    zValidator("json", sectionSchema.omit({ fields: true })),
    async (c) => {
      try {
        const templateId = c.req.param("id");
        const data = c.req.valid("json");

        // Check if template exists
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
            sectionKey: data.sectionKey,
            title: data.title,
            description: data.description ?? null,
            helpText: data.helpText ?? null,
            isRequired: data.isRequired ?? false,
            buttonConfig: data.buttonConfig ?? null,
            orderIndex: data.orderIndex,
          })
          .returning();

        await invalidateCache(cacheKeys.all());

        return c.json({ data: section }, 201);
      } catch (error) {
        console.error("Error adding section:", error);
        return c.json(
          { error: "Failed to add section", details: String(error) },
          500
        );
      }
    }
  )

  // Update section
  .patch(
    "/:id/sections/:sectionId",
    zValidator("json", updateSectionSchema),
    async (c) => {
      try {
        const templateId = c.req.param("id");
        const sectionId = c.req.param("sectionId");
        const data = c.req.valid("json");

        // Check if section exists and belongs to template
        const [existing] = await db
          .select()
          .from(schema.formSections)
          .where(
            and(
              eq(schema.formSections.id, sectionId),
              eq(schema.formSections.formTemplateId, templateId)
            )
          )
          .limit(1);

        if (!existing) {
          return c.json({ error: "Section not found" }, 404);
        }

        const [updated] = await db
          .update(schema.formSections)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(schema.formSections.id, sectionId))
          .returning();

        await invalidateCache(cacheKeys.all());

        return c.json({ data: updated });
      } catch (error) {
        console.error("Error updating section:", error);
        return c.json(
          { error: "Failed to update section", details: String(error) },
          500
        );
      }
    }
  )

  // Delete section
  .delete("/:id/sections/:sectionId", async (c) => {
    try {
      const templateId = c.req.param("id");
      const sectionId = c.req.param("sectionId");

      // Check if section exists and belongs to template
      const [existing] = await db
        .select()
        .from(schema.formSections)
        .where(
          and(
            eq(schema.formSections.id, sectionId),
            eq(schema.formSections.formTemplateId, templateId)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "Section not found" }, 404);
      }

      // Delete section (cascade will delete fields and autofill mappings)
      await db
        .delete(schema.formSections)
        .where(eq(schema.formSections.id, sectionId));

      await invalidateCache(cacheKeys.all());

      return c.json({ success: true });
    } catch (error) {
      console.error("Error deleting section:", error);
      return c.json(
        { error: "Failed to delete section", details: String(error) },
        500
      );
    }
  })

  // Reorder sections
  .patch("/:id/sections/reorder", zValidator("json", reorderSchema), async (c) => {
    try {
      const templateId = c.req.param("id");
      const { items } = c.req.valid("json");

      // Check if template exists
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

      // Update each section's orderIndex in a transaction
      await db.transaction(async (tx) => {
        for (const item of items) {
          await tx
            .update(schema.formSections)
            .set({
              orderIndex: item.orderIndex,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(schema.formSections.id, item.id),
                eq(schema.formSections.formTemplateId, templateId)
              )
            );
        }
      });

      await invalidateCache(cacheKeys.all());

      return c.json({ success: true });
    } catch (error) {
      console.error("Error reordering sections:", error);
      return c.json(
        { error: "Failed to reorder sections", details: String(error) },
        500
      );
    }
  })

  // Add field to section
  .post(
    "/:id/sections/:sectionId/fields",
    zValidator("json", fieldSchema),
    async (c) => {
      try {
        const templateId = c.req.param("id");
        const sectionId = c.req.param("sectionId");
        const data = c.req.valid("json");

        // Check if section exists and belongs to template
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
          return c.json({ error: "Section not found" }, 404);
        }

        const result = await db.transaction(async (tx) => {
          const [field] = await tx
            .insert(schema.formFields)
            .values({
              formSectionId: sectionId,
              name: data.name,
              label: data.label,
              fieldType: data.fieldType,
              pdfMappings: data.pdfMappings ?? null,
              placeholder: data.placeholder ?? null,
              helpText: data.helpText ?? null,
              options: data.options ?? null,
              validationRules: data.validationRules ?? null,
              defaultValue: data.defaultValue ?? null,
              width: data.width ?? null,
              isRequired: data.isRequired ?? false,
              disabled: data.disabled ?? false,
              hideLabel: data.hideLabel ?? false,
              className: data.className ?? null,
              fieldConfig: data.fieldConfig ?? null,
              orderIndex: data.orderIndex,
              showWhen: data.showWhen ?? null,
            })
            .returning();

          let autofillMapping = null;
          if (data.autofillMapping?.canonicalField) {
            const [mapping] = await tx
              .insert(schema.formFieldAutofillMappings)
              .values({
                formFieldId: field.id,
                canonicalField: data.autofillMapping.canonicalField,
                transformationRule:
                  data.autofillMapping.transformationRule ?? null,
                fallbackValue: data.autofillMapping.fallbackValue ?? null,
              })
              .returning();
            autofillMapping = mapping;
          }

          return { ...field, autofillMapping };
        });

        await invalidateCache(cacheKeys.all());

        return c.json({ data: result }, 201);
      } catch (error) {
        console.error("Error adding field:", error);
        return c.json(
          { error: "Failed to add field", details: String(error) },
          500
        );
      }
    }
  )

  // Update field
  .patch(
    "/:id/sections/:sectionId/fields/:fieldId",
    zValidator("json", updateFieldSchema),
    async (c) => {
      try {
        const templateId = c.req.param("id");
        const sectionId = c.req.param("sectionId");
        const fieldId = c.req.param("fieldId");
        const data = c.req.valid("json");

        // Check if field exists and belongs to section
        const [existing] = await db
          .select({
            field: schema.formFields,
            section: schema.formSections,
          })
          .from(schema.formFields)
          .innerJoin(
            schema.formSections,
            eq(schema.formFields.formSectionId, schema.formSections.id)
          )
          .where(
            and(
              eq(schema.formFields.id, fieldId),
              eq(schema.formFields.formSectionId, sectionId),
              eq(schema.formSections.formTemplateId, templateId)
            )
          )
          .limit(1);

        if (!existing) {
          return c.json({ error: "Field not found" }, 404);
        }

        const { autofillMapping, ...fieldData } = data;

        const result = await db.transaction(async (tx) => {
          // Update field
          const [field] = await tx
            .update(schema.formFields)
            .set({
              ...fieldData,
              updatedAt: new Date(),
            })
            .where(eq(schema.formFields.id, fieldId))
            .returning();

          // Handle autofill mapping
          let updatedMapping = null;
          if (autofillMapping !== undefined) {
            // Delete existing mapping
            await tx
              .delete(schema.formFieldAutofillMappings)
              .where(
                eq(schema.formFieldAutofillMappings.formFieldId, fieldId)
              );

            // Create new mapping if provided
            if (autofillMapping?.canonicalField) {
              const [mapping] = await tx
                .insert(schema.formFieldAutofillMappings)
                .values({
                  formFieldId: fieldId,
                  canonicalField: autofillMapping.canonicalField,
                  transformationRule:
                    autofillMapping.transformationRule ?? null,
                  fallbackValue: autofillMapping.fallbackValue ?? null,
                })
                .returning();
              updatedMapping = mapping;
            }
          } else {
            // Fetch existing mapping if not updated
            const [existingMapping] = await tx
              .select()
              .from(schema.formFieldAutofillMappings)
              .where(eq(schema.formFieldAutofillMappings.formFieldId, fieldId))
              .limit(1);
            updatedMapping = existingMapping ?? null;
          }

          return { ...field, autofillMapping: updatedMapping };
        });

        await invalidateCache(cacheKeys.all());

        return c.json({ data: result });
      } catch (error) {
        console.error("Error updating field:", error);
        return c.json(
          { error: "Failed to update field", details: String(error) },
          500
        );
      }
    }
  )

  // Delete field
  .delete("/:id/sections/:sectionId/fields/:fieldId", async (c) => {
    try {
      const templateId = c.req.param("id");
      const sectionId = c.req.param("sectionId");
      const fieldId = c.req.param("fieldId");

      // Check if field exists and belongs to section
      const [existing] = await db
        .select({
          field: schema.formFields,
          section: schema.formSections,
        })
        .from(schema.formFields)
        .innerJoin(
          schema.formSections,
          eq(schema.formFields.formSectionId, schema.formSections.id)
        )
        .where(
          and(
            eq(schema.formFields.id, fieldId),
            eq(schema.formFields.formSectionId, sectionId),
            eq(schema.formSections.formTemplateId, templateId)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "Field not found" }, 404);
      }

      // Delete field (cascade will delete autofill mapping)
      await db.delete(schema.formFields).where(eq(schema.formFields.id, fieldId));

      await invalidateCache(cacheKeys.all());

      return c.json({ success: true });
    } catch (error) {
      console.error("Error deleting field:", error);
      return c.json(
        { error: "Failed to delete field", details: String(error) },
        500
      );
    }
  })

  // Reorder fields
  .patch(
    "/:id/sections/:sectionId/fields/reorder",
    zValidator("json", reorderSchema),
    async (c) => {
      try {
        const templateId = c.req.param("id");
        const sectionId = c.req.param("sectionId");
        const { items } = c.req.valid("json");

        // Check if section exists and belongs to template
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
          return c.json({ error: "Section not found" }, 404);
        }

        // Update each field's orderIndex in a transaction
        await db.transaction(async (tx) => {
          for (const item of items) {
            await tx
              .update(schema.formFields)
              .set({
                orderIndex: item.orderIndex,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(schema.formFields.id, item.id),
                  eq(schema.formFields.formSectionId, sectionId)
                )
              );
          }
        });

        await invalidateCache(cacheKeys.all());

        return c.json({ success: true });
      } catch (error) {
        console.error("Error reordering fields:", error);
        return c.json(
          { error: "Failed to reorder fields", details: String(error) },
          500
        );
      }
    }
  )

  // Get instance count for template
  .get("/:id/instance-count", async (c) => {
    try {
      const templateId = c.req.param("id");

      // Check if template exists
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

      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.formInstances)
        .where(
          and(
            eq(schema.formInstances.formTemplateId, templateId),
            isNull(schema.formInstances.deletedAt)
          )
        );

      return c.json({ data: { count: result.count } });
    } catch (error) {
      console.error("Error getting instance count:", error);
      return c.json(
        { error: "Failed to get instance count", details: String(error) },
        500
      );
    }
  })

  // Duplicate template
  .post("/:id/duplicate", async (c) => {
    try {
      const user = c.get("user");
      const templateId = c.req.param("id");

      // Get original template
      const [original] = await db
        .select()
        .from(schema.formTemplates)
        .where(
          and(
            eq(schema.formTemplates.id, templateId),
            isNull(schema.formTemplates.deletedAt)
          )
        )
        .limit(1);

      if (!original) {
        return c.json({ error: "Form template not found" }, 404);
      }

      // Get sections with fields and autofill mappings
      const sections = await db
        .select()
        .from(schema.formSections)
        .where(eq(schema.formSections.formTemplateId, templateId))
        .orderBy(asc(schema.formSections.orderIndex));

      const sectionIds = sections.map((s) => s.id);

      const fieldsWithMappings =
        sectionIds.length > 0
          ? await db
              .select({
                field: schema.formFields,
                autofillMapping: schema.formFieldAutofillMappings,
              })
              .from(schema.formFields)
              .leftJoin(
                schema.formFieldAutofillMappings,
                eq(
                  schema.formFields.id,
                  schema.formFieldAutofillMappings.formFieldId
                )
              )
              .where(
                or(
                  ...sectionIds.map((id) =>
                    eq(schema.formFields.formSectionId, id)
                  )
                )
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

      // Create duplicate in transaction
      const result = await db.transaction(async (tx) => {
        // Create new template with "(Copy)" suffix
        const [newTemplate] = await tx
          .insert(schema.formTemplates)
          .values({
            organizationId: original.organizationId,
            formNumber: original.formNumber,
            title: `${original.title} (Copy)`,
            revision: original.revision,
            pdfTemplateUrl: original.pdfTemplateUrl,
            createdBy: user.id,
            updatedBy: user.id,
          })
          .returning();

        const newSections = [];
        for (const section of sections) {
          const [newSection] = await tx
            .insert(schema.formSections)
            .values({
              formTemplateId: newTemplate.id,
              sectionKey: section.sectionKey,
              title: section.title,
              description: section.description,
              helpText: section.helpText,
              isRequired: section.isRequired,
              buttonConfig: section.buttonConfig,
              orderIndex: section.orderIndex,
            })
            .returning();

          const newFields = [];
          const sectionFields = fieldsBySection[section.id] || [];
          for (const { field, autofillMapping } of sectionFields) {
            const [newField] = await tx
              .insert(schema.formFields)
              .values({
                formSectionId: newSection.id,
                name: field.name,
                label: field.label,
                fieldType: field.fieldType,
                pdfMappings: field.pdfMappings,
                placeholder: field.placeholder,
                helpText: field.helpText,
                options: field.options,
                validationRules: field.validationRules,
                defaultValue: field.defaultValue,
                width: field.width,
                isRequired: field.isRequired,
                disabled: field.disabled,
                hideLabel: field.hideLabel,
                className: field.className,
                fieldConfig: field.fieldConfig,
                orderIndex: field.orderIndex,
                showWhen: field.showWhen,
              })
              .returning();

            let newAutofillMapping = null;
            if (autofillMapping) {
              const [mapping] = await tx
                .insert(schema.formFieldAutofillMappings)
                .values({
                  formFieldId: newField.id,
                  canonicalField: autofillMapping.canonicalField,
                  transformationRule: autofillMapping.transformationRule,
                  fallbackValue: autofillMapping.fallbackValue,
                })
                .returning();
              newAutofillMapping = mapping;
            }

            newFields.push({ ...newField, autofillMapping: newAutofillMapping });
          }

          newSections.push({ ...newSection, fields: newFields });
        }

        return { ...newTemplate, sections: newSections };
      });

      await invalidateCache(cacheKeys.all());

      return c.json({ data: result }, 201);
    } catch (error) {
      console.error("Error duplicating template:", error);
      return c.json(
        { error: "Failed to duplicate template", details: String(error) },
        500
      );
    }
  })

  // Generate pre-signed upload URL for PDF template
  .post(
    "/:id/pdf-upload-url",
    zValidator(
      "json",
      z.object({
        filename: z.string().min(1),
        contentType: z.string().refine(
          (val) => val === "application/pdf",
          { message: "Content type must be application/pdf" }
        ),
      })
    ),
    async (c) => {
      try {
        const templateId = c.req.param("id");
        const { filename, contentType } = c.req.valid("json");

        // Check if template exists
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

        // Generate S3 key and pre-signed upload URL
        const key = generateFormTemplateKey(templateId, filename);
        const uploadUrl = await generateUploadUrl(key, contentType);

        return c.json({ uploadUrl, key });
      } catch (error) {
        console.error("Error generating PDF upload URL:", error);
        return c.json(
          { error: "Failed to generate upload URL", details: String(error) },
          500
        );
      }
    }
  )

  // Get pre-signed download URL for existing PDF template
  .get("/:id/pdf-download-url", async (c) => {
    try {
      const templateId = c.req.param("id");

      // Check if template exists and has a PDF
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

      if (!template.pdfTemplateUrl) {
        return c.json({ error: "No PDF template uploaded" }, 404);
      }

      // Generate pre-signed download URL
      const downloadUrl = await generateDownloadUrl(template.pdfTemplateUrl);

      return c.json({ downloadUrl });
    } catch (error) {
      console.error("Error generating PDF download URL:", error);
      return c.json(
        { error: "Failed to generate download URL", details: String(error) },
        500
      );
    }
  });

export default app;
