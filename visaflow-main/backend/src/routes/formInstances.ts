import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { requireOrg } from "../middleware/requireOrg.js";
import { requireOrgAdmin } from "../middleware/role.js";
import { eq, isNull, and, or, desc, sql, inArray } from "drizzle-orm";
import { invalidateCache, cacheKeys } from "../lib/redis.js";
import { generateFilledPdf } from "../lib/pdf/pdfGenerator.js";
import { generateDownloadUrl } from "../lib/s3/index.js";

// Validation schemas
const createFormInstanceSchema = z.object({
  clientId: z.string().uuid(),
  formTemplateId: z.string().uuid(),
});

const updateFormInstanceSchema = z.object({
  status: z.enum(["draft", "in_progress", "completed"]).optional(),
  currentStepIndex: z.number().int().min(0).optional(),
  completedStepIds: z.array(z.string()).optional(),
});

const bulkUpdateResponsesSchema = z.object({
  responses: z.array(
    z.object({
      formFieldId: z.string().uuid(),
      value: z.string().nullable(),
      version: z.number().int().optional(),
    })
  ),
});

const listQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  formTemplateId: z.string().uuid().optional(),
  status: z.enum(["draft", "in_progress", "completed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const generatePdfQuerySchema = z.object({
  type: z.enum(["draft", "review", "final"]).default("review"),
});

const getPdfQuerySchema = z.object({
  type: z.enum(["draft", "review", "final"]).optional(),
});

// Create app with chained routes for type inference
const app = new Hono()
  // Apply auth to all routes
  .use("*", authMiddleware)
  .use("*", requireOrg)
  // Cache GET responses
  .use("*", cacheMiddleware())

  // Create new form instance (admin only)
  .post("/", requireOrgAdmin, zValidator("json", createFormInstanceSchema), async (c) => {
    try {
      const user = c.get("user");
      const { clientId, formTemplateId } = c.req.valid("json");

      // Verify client belongs to this organization
      const [client] = await db
        .select()
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.id, clientId),
            eq(schema.clients.organizationId, user.organizationId!),
            isNull(schema.clients.deletedAt)
          )
        )
        .limit(1);

      if (!client) {
        return c.json({ error: "Client not found" }, 404);
      }

      // Verify template exists and is accessible
      const [template] = await db
        .select()
        .from(schema.formTemplates)
        .where(
          and(
            eq(schema.formTemplates.id, formTemplateId),
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

      // Calculate next instance number for this client+template
      const [maxInstance] = await db
        .select({
          maxNum: sql<number>`COALESCE(MAX(instance_number), 0)`,
        })
        .from(schema.formInstances)
        .where(
          and(
            eq(schema.formInstances.clientId, clientId),
            eq(schema.formInstances.formTemplateId, formTemplateId)
          )
        );

      const instanceNumber = (maxInstance?.maxNum ?? 0) + 1;

      // Create instance
      const [instance] = await db
        .insert(schema.formInstances)
        .values({
          organizationId: user.organizationId!,
          clientId,
          formTemplateId,
          instanceNumber,
          status: "draft",
          currentStepIndex: 0,
          completedStepIds: [],
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning();

      // Invalidate cache
      await invalidateCache(cacheKeys.all());

      return c.json(instance, 201);
    } catch (error) {
      console.error("Error creating form instance:", error);
      return c.json(
        { error: "Failed to create form instance", details: String(error) },
        500
      );
    }
  })

  // List form instances with filters
  .get("/", async (c) => {
    try {
      const user = c.get("user");
      const query = listQuerySchema.parse({
        clientId: c.req.query("clientId"),
        formTemplateId: c.req.query("formTemplateId"),
        status: c.req.query("status"),
        page: c.req.query("page"),
        pageSize: c.req.query("pageSize"),
      });

      const { clientId, formTemplateId, status, page, pageSize } = query;
      const offset = (page - 1) * pageSize;

      // Build conditions
      const conditions = [
        eq(schema.formInstances.organizationId, user.organizationId!),
        isNull(schema.formInstances.deletedAt),
      ];

      if (clientId) {
        conditions.push(eq(schema.formInstances.clientId, clientId));
      }
      if (formTemplateId) {
        conditions.push(eq(schema.formInstances.formTemplateId, formTemplateId));
      }
      if (status) {
        conditions.push(eq(schema.formInstances.status, status));
      }

      // Get instances with template info
      const [instances, countResult] = await Promise.all([
        db
          .select({
            instance: schema.formInstances,
            template: {
              formNumber: schema.formTemplates.formNumber,
              title: schema.formTemplates.title,
              revision: schema.formTemplates.revision,
            },
          })
          .from(schema.formInstances)
          .innerJoin(
            schema.formTemplates,
            eq(schema.formInstances.formTemplateId, schema.formTemplates.id)
          )
          .where(and(...conditions))
          .limit(pageSize)
          .offset(offset)
          .orderBy(desc(schema.formInstances.updatedAt)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.formInstances)
          .where(and(...conditions)),
      ]);

      const total = countResult[0]?.count ?? 0;

      // Flatten the response
      const items = instances.map(({ instance, template }) => ({
        ...instance,
        formNumber: template.formNumber,
        title: template.title,
        revision: template.revision,
      }));

      return c.json({
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      console.error("Error listing form instances:", error);
      return c.json(
        { error: "Failed to list form instances", details: String(error) },
        500
      );
    }
  })

  // Get single form instance with responses
  .get("/:id", async (c) => {
    try {
      const user = c.get("user");
      const instanceId = c.req.param("id");

      // Get instance
      const [instance] = await db
        .select()
        .from(schema.formInstances)
        .where(
          and(
            eq(schema.formInstances.id, instanceId),
            eq(schema.formInstances.organizationId, user.organizationId!),
            isNull(schema.formInstances.deletedAt)
          )
        )
        .limit(1);

      if (!instance) {
        return c.json({ error: "Form instance not found" }, 404);
      }

      // Get all responses for this instance
      const responses = await db
        .select()
        .from(schema.formResponses)
        .where(eq(schema.formResponses.formInstanceId, instanceId));

      // Get field names for mapping responses
      const fieldIds = responses.map((r) => r.formFieldId);
      const fields =
        fieldIds.length > 0
          ? await db
              .select({ id: schema.formFields.id, name: schema.formFields.name })
              .from(schema.formFields)
              .where(inArray(schema.formFields.id, fieldIds))
          : [];

      const fieldIdToName: Record<string, string> = {};
      for (const field of fields) {
        fieldIdToName[field.id] = field.name;
      }

      // Build responses as { fieldName: { value, version, formFieldId } }
      const responsesMap: Record<
        string,
        { value: string | null; version: number; formFieldId: string }
      > = {};
      for (const response of responses) {
        const fieldName = fieldIdToName[response.formFieldId];
        if (fieldName) {
          responsesMap[fieldName] = {
            value: response.value,
            version: response.version,
            formFieldId: response.formFieldId,
          };
        }
      }

      return c.json({
        ...instance,
        responses: responsesMap,
      });
    } catch (error) {
      console.error("Error getting form instance:", error);
      return c.json(
        { error: "Failed to get form instance", details: String(error) },
        500
      );
    }
  })

  // Update form instance status/progress (admin only)
  .patch("/:id", requireOrgAdmin, zValidator("json", updateFormInstanceSchema), async (c) => {
    try {
      const user = c.get("user");
      const instanceId = c.req.param("id");
      const updates = c.req.valid("json");

      // Verify instance exists and belongs to org
      const [existing] = await db
        .select()
        .from(schema.formInstances)
        .where(
          and(
            eq(schema.formInstances.id, instanceId),
            eq(schema.formInstances.organizationId, user.organizationId!),
            isNull(schema.formInstances.deletedAt)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "Form instance not found" }, 404);
      }

      // Build update values
      const updateValues: Record<string, unknown> = {
        updatedAt: new Date(),
        updatedBy: user.id,
      };

      if (updates.status !== undefined) {
        updateValues.status = updates.status;
        if (updates.status === "completed") {
          updateValues.submittedAt = new Date();
          updateValues.submittedBy = user.id;
        }
      }
      if (updates.currentStepIndex !== undefined) {
        updateValues.currentStepIndex = updates.currentStepIndex;
      }
      if (updates.completedStepIds !== undefined) {
        updateValues.completedStepIds = updates.completedStepIds;
      }

      // Update instance
      const [updated] = await db
        .update(schema.formInstances)
        .set(updateValues)
        .where(eq(schema.formInstances.id, instanceId))
        .returning();

      // Invalidate cache
      await invalidateCache(cacheKeys.all());

      return c.json(updated);
    } catch (error) {
      console.error("Error updating form instance:", error);
      return c.json(
        { error: "Failed to update form instance", details: String(error) },
        500
      );
    }
  })

  // Soft delete form instance (admin only)
  .delete("/:id", requireOrgAdmin, async (c) => {
    try {
      const user = c.get("user");
      const instanceId = c.req.param("id");

      // Verify instance exists and belongs to org
      const [existing] = await db
        .select()
        .from(schema.formInstances)
        .where(
          and(
            eq(schema.formInstances.id, instanceId),
            eq(schema.formInstances.organizationId, user.organizationId!),
            isNull(schema.formInstances.deletedAt)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "Form instance not found" }, 404);
      }

      // Soft delete
      await db
        .update(schema.formInstances)
        .set({
          deletedAt: new Date(),
          deletedBy: user.id,
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(schema.formInstances.id, instanceId));

      // Invalidate cache
      await invalidateCache(cacheKeys.all());

      return c.json({ success: true });
    } catch (error) {
      console.error("Error deleting form instance:", error);
      return c.json(
        { error: "Failed to delete form instance", details: String(error) },
        500
      );
    }
  })

  // Get all responses for an instance
  .get("/:id/responses", async (c) => {
    try {
      const user = c.get("user");
      const instanceId = c.req.param("id");

      // Verify instance exists and belongs to org
      const [instance] = await db
        .select()
        .from(schema.formInstances)
        .where(
          and(
            eq(schema.formInstances.id, instanceId),
            eq(schema.formInstances.organizationId, user.organizationId!),
            isNull(schema.formInstances.deletedAt)
          )
        )
        .limit(1);

      if (!instance) {
        return c.json({ error: "Form instance not found" }, 404);
      }

      // Get responses with field info
      const responses = await db
        .select({
          response: schema.formResponses,
          fieldName: schema.formFields.name,
        })
        .from(schema.formResponses)
        .innerJoin(
          schema.formFields,
          eq(schema.formResponses.formFieldId, schema.formFields.id)
        )
        .where(eq(schema.formResponses.formInstanceId, instanceId));

      // Build response map
      const responsesMap: Record<
        string,
        { value: string | null; version: number; formFieldId: string; updatedAt: Date }
      > = {};
      for (const { response, fieldName } of responses) {
        responsesMap[fieldName] = {
          value: response.value,
          version: response.version,
          formFieldId: response.formFieldId,
          updatedAt: response.updatedAt,
        };
      }

      return c.json(responsesMap);
    } catch (error) {
      console.error("Error getting form responses:", error);
      return c.json(
        { error: "Failed to get form responses", details: String(error) },
        500
      );
    }
  })

  // Bulk update responses (admin only)
  .patch("/:id/responses", requireOrgAdmin, zValidator("json", bulkUpdateResponsesSchema), async (c) => {
    try {
      const user = c.get("user");
      const instanceId = c.req.param("id");
      const { responses } = c.req.valid("json");

      // Verify instance exists and belongs to org
      const [instance] = await db
        .select()
        .from(schema.formInstances)
        .where(
          and(
            eq(schema.formInstances.id, instanceId),
            eq(schema.formInstances.organizationId, user.organizationId!),
            isNull(schema.formInstances.deletedAt)
          )
        )
        .limit(1);

      if (!instance) {
        return c.json({ error: "Form instance not found" }, 404);
      }

      let updated = 0;
      let created = 0;

      // Process responses in a transaction
      await db.transaction(async (tx) => {
        for (const { formFieldId, value, version } of responses) {
          // Check if response exists
          const [existing] = await tx
            .select()
            .from(schema.formResponses)
            .where(
              and(
                eq(schema.formResponses.formInstanceId, instanceId),
                eq(schema.formResponses.formFieldId, formFieldId)
              )
            )
            .limit(1);

          if (existing) {
            // Check version for optimistic locking
            if (version !== undefined && existing.version !== version) {
              throw new Error(
                `Conflict: Field ${formFieldId} was modified by another user. Expected version ${version}, found ${existing.version}`
              );
            }

            // Update existing
            await tx
              .update(schema.formResponses)
              .set({
                value,
                version: existing.version + 1,
                updatedAt: new Date(),
                updatedBy: user.id,
              })
              .where(eq(schema.formResponses.id, existing.id));
            updated++;
          } else {
            // Insert new
            await tx.insert(schema.formResponses).values({
              formInstanceId: instanceId,
              formFieldId,
              value,
              version: 1,
              updatedBy: user.id,
            });
            created++;
          }
        }

        // Update instance timestamp
        await tx
          .update(schema.formInstances)
          .set({ updatedAt: new Date(), updatedBy: user.id })
          .where(eq(schema.formInstances.id, instanceId));
      });

      // Invalidate cache
      await invalidateCache(cacheKeys.all());

      return c.json({ success: true, updated, created });
    } catch (error) {
      console.error("Error updating form responses:", error);

      // Check if it's a conflict error
      if (error instanceof Error && error.message.startsWith("Conflict:")) {
        return c.json({ error: error.message }, 409);
      }

      return c.json(
        { error: "Failed to update form responses", details: String(error) },
        500
      );
    }
  })

  // Get autofill values from client's field values
  .get("/:id/autofill", async (c) => {
    try {
      const user = c.get("user");
      const instanceId = c.req.param("id");

      // Get instance to find clientId and templateId
      const [instance] = await db
        .select()
        .from(schema.formInstances)
        .where(
          and(
            eq(schema.formInstances.id, instanceId),
            eq(schema.formInstances.organizationId, user.organizationId!),
            isNull(schema.formInstances.deletedAt)
          )
        )
        .limit(1);

      if (!instance) {
        return c.json({ error: "Form instance not found" }, 404);
      }

      // Get all autofill mappings for this template's fields
      const mappings = await db
        .select({
          formFieldId: schema.formFields.id,
          fieldName: schema.formFields.name,
          canonicalField: schema.formFieldAutofillMappings.canonicalField,
          transformationRule: schema.formFieldAutofillMappings.transformationRule,
          fallbackValue: schema.formFieldAutofillMappings.fallbackValue,
        })
        .from(schema.formFields)
        .innerJoin(
          schema.formSections,
          eq(schema.formFields.formSectionId, schema.formSections.id)
        )
        .innerJoin(
          schema.formFieldAutofillMappings,
          eq(schema.formFields.id, schema.formFieldAutofillMappings.formFieldId)
        )
        .where(eq(schema.formSections.formTemplateId, instance.formTemplateId));

      if (mappings.length === 0) {
        return c.json({});
      }

      // Get active client field values for the canonical fields
      const canonicalFields = mappings.map((m) => m.canonicalField);
      const clientValues = await db
        .select()
        .from(schema.clientFieldValues)
        .where(
          and(
            eq(schema.clientFieldValues.clientId, instance.clientId),
            eq(schema.clientFieldValues.isActive, true),
            inArray(schema.clientFieldValues.canonicalField, canonicalFields)
          )
        );

      // Build lookup map: canonicalField -> value
      const valuesByCanonical: Record<string, string> = {};
      for (const v of clientValues) {
        valuesByCanonical[v.canonicalField] = v.rawValue;
      }

      // Build autofill response: { fieldName: value }
      const autofillValues: Record<string, string | null> = {};
      for (const mapping of mappings) {
        const value =
          valuesByCanonical[mapping.canonicalField] ??
          mapping.fallbackValue ??
          null;
        autofillValues[mapping.fieldName] = value;
      }

      return c.json(autofillValues);
    } catch (error) {
      console.error("Error getting autofill values:", error);
      return c.json(
        { error: "Failed to get autofill values", details: String(error) },
        500
      );
    }
  })

  // Generate filled PDF for an instance
  .post("/:id/generate-pdf", requireOrgAdmin, zValidator("query", generatePdfQuerySchema), async (c) => {
    try {
      const user = c.get("user");
      const instanceId = c.req.param("id");
      const { type } = c.req.valid("query");

      // Generate the filled PDF
      const result = await generateFilledPdf({
        formInstanceId: instanceId,
        generationType: type,
        organizationId: user.organizationId!,
        userId: user.id,
      });

      return c.json(result, 201);
    } catch (error) {
      console.error("Error generating PDF:", error);
      return c.json(
        { error: "Failed to generate PDF", details: String(error) },
        500
      );
    }
  })

  // Get latest generated PDF for an instance
  .get("/:id/pdf", zValidator("query", getPdfQuerySchema), async (c) => {
    try {
      const user = c.get("user");
      const instanceId = c.req.param("id");
      const { type } = c.req.valid("query");

      // Verify instance exists and belongs to org
      const [instance] = await db
        .select()
        .from(schema.formInstances)
        .where(
          and(
            eq(schema.formInstances.id, instanceId),
            eq(schema.formInstances.organizationId, user.organizationId!),
            isNull(schema.formInstances.deletedAt)
          )
        )
        .limit(1);

      if (!instance) {
        return c.json({ error: "Form instance not found" }, 404);
      }

      // Get the most recent generated PDF
      const conditions = [
        eq(schema.formGeneratedPdfs.formInstanceId, instanceId),
      ];
      if (type) {
        conditions.push(eq(schema.formGeneratedPdfs.generationType, type));
      }

      const [pdf] = await db
        .select()
        .from(schema.formGeneratedPdfs)
        .where(and(...conditions))
        .orderBy(desc(schema.formGeneratedPdfs.generatedAt))
        .limit(1);

      if (!pdf) {
        return c.json({ error: "No generated PDF found" }, 404);
      }

      // Generate a fresh download URL
      const pdfUrl = await generateDownloadUrl(pdf.filePath);

      return c.json({
        ...pdf,
        pdfUrl,
      });
    } catch (error) {
      console.error("Error getting PDF:", error);
      return c.json(
        { error: "Failed to get PDF", details: String(error) },
        500
      );
    }
  });

export default app;
