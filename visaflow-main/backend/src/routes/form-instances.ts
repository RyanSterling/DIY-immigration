import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { requireOrg } from "../middleware/requireOrg.js";
import { eq, isNull, and, asc, desc, sql, max } from "drizzle-orm";
import { invalidateCache, cacheKeys } from "../lib/redis.js";

// Validation schemas
const createInstanceSchema = z.object({
  clientId: z.string().uuid(),
  formTemplateId: z.string().uuid(),
  responses: z.record(z.string(), z.string().nullable()), // fieldName -> value
  currentStepIndex: z.number().int().min(0).optional(),
  completedStepIds: z.array(z.string()).optional(),
});

const updateInstanceSchema = z.object({
  status: z.enum(["draft", "in_progress", "completed"]).optional(),
  currentStepIndex: z.number().int().min(0).optional(),
  completedStepIds: z.array(z.string()).optional(),
});

const app = new Hono()
  .use("*", authMiddleware)
  .use("*", requireOrg)
  .use("*", cacheMiddleware())

  // List form instances (filtered by clientId query param)
  .get("/", async (c) => {
    try {
      const user = c.get("user");
      const clientId = c.req.query("clientId");

      let query = db
        .select({
          id: schema.formInstances.id,
          clientId: schema.formInstances.clientId,
          formTemplateId: schema.formInstances.formTemplateId,
          instanceNumber: schema.formInstances.instanceNumber,
          status: schema.formInstances.status,
          currentStepIndex: schema.formInstances.currentStepIndex,
          completedStepIds: schema.formInstances.completedStepIds,
          createdAt: schema.formInstances.createdAt,
          updatedAt: schema.formInstances.updatedAt,
          submittedAt: schema.formInstances.submittedAt,
          // Include template info
          formNumber: schema.formTemplates.formNumber,
          formTitle: schema.formTemplates.title,
        })
        .from(schema.formInstances)
        .leftJoin(
          schema.formTemplates,
          eq(schema.formInstances.formTemplateId, schema.formTemplates.id)
        )
        .where(
          and(
            eq(schema.formInstances.organizationId, user.organizationId!),
            isNull(schema.formInstances.deletedAt),
            ...(clientId ? [eq(schema.formInstances.clientId, clientId)] : [])
          )
        )
        .orderBy(desc(schema.formInstances.createdAt));

      const instances = await query;

      return c.json({ items: instances });
    } catch (error) {
      console.error("Error listing form instances:", error);
      return c.json(
        { error: "Failed to list form instances", details: String(error) },
        500
      );
    }
  })

  // Get single instance with responses
  .get("/:id", async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();

      // Get the instance
      const [instance] = await db
        .select()
        .from(schema.formInstances)
        .where(
          and(
            eq(schema.formInstances.id, id),
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
        .select({
          id: schema.formResponses.id,
          formFieldId: schema.formResponses.formFieldId,
          value: schema.formResponses.value,
          version: schema.formResponses.version,
          updatedAt: schema.formResponses.updatedAt,
          // Include field name for easier mapping
          fieldName: schema.formFields.name,
        })
        .from(schema.formResponses)
        .leftJoin(
          schema.formFields,
          eq(schema.formResponses.formFieldId, schema.formFields.id)
        )
        .where(eq(schema.formResponses.formInstanceId, id));

      // Transform responses into a map keyed by field name
      const responsesMap: Record<
        string,
        {
          id: string;
          formFieldId: string;
          value: string | null;
          version: number;
        }
      > = {};

      for (const response of responses) {
        if (response.fieldName) {
          responsesMap[response.fieldName] = {
            id: response.id,
            formFieldId: response.formFieldId,
            value: response.value,
            version: response.version,
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

  // Create new form instance for a client (first save)
  // Frontend handles autofill display; this just saves what user approved
  .post("/", zValidator("json", createInstanceSchema), async (c) => {
    try {
      const user = c.get("user");
      const { clientId, formTemplateId, responses, currentStepIndex, completedStepIds } = c.req.valid("json");

      // Verify client exists and belongs to org
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

      // Verify template exists
      const [template] = await db
        .select()
        .from(schema.formTemplates)
        .where(
          and(
            eq(schema.formTemplates.id, formTemplateId),
            isNull(schema.formTemplates.deletedAt)
          )
        )
        .limit(1);

      if (!template) {
        return c.json({ error: "Form template not found" }, 404);
      }

      // Get next instance number for this client/template combo
      const [maxInstance] = await db
        .select({
          maxNum: max(schema.formInstances.instanceNumber),
        })
        .from(schema.formInstances)
        .where(
          and(
            eq(schema.formInstances.clientId, clientId),
            eq(schema.formInstances.formTemplateId, formTemplateId)
          )
        );

      const instanceNumber = (maxInstance?.maxNum ?? 0) + 1;

      // Get all fields for this template to map field names to IDs
      const templateFields = await db
        .select({
          fieldId: schema.formFields.id,
          fieldName: schema.formFields.name,
        })
        .from(schema.formFields)
        .innerJoin(
          schema.formSections,
          eq(schema.formFields.formSectionId, schema.formSections.id)
        )
        .where(eq(schema.formSections.formTemplateId, formTemplateId));

      // Build field name -> ID lookup
      const fieldNameToId = new Map(
        templateFields.map((f) => [f.fieldName, f.fieldId])
      );

      // Create instance + responses in a transaction
      const result = await db.transaction(async (tx) => {
        // Create the instance
        const [instance] = await tx
          .insert(schema.formInstances)
          .values({
            organizationId: user.organizationId!,
            clientId,
            formTemplateId,
            instanceNumber,
            status: "draft",
            currentStepIndex: currentStepIndex ?? 0,
            completedStepIds: completedStepIds ?? [],
            createdBy: user.id,
            updatedBy: user.id,
          })
          .returning();

        // Create responses for each field in the request
        const responsesToInsert: Array<{
          formInstanceId: string;
          formFieldId: string;
          value: string | null;
          updatedBy: string;
        }> = [];

        for (const [fieldName, value] of Object.entries(responses)) {
          const fieldId = fieldNameToId.get(fieldName);
          if (fieldId) {
            responsesToInsert.push({
              formInstanceId: instance.id,
              formFieldId: fieldId,
              value,
              updatedBy: user.id,
            });
          }
        }

        if (responsesToInsert.length > 0) {
          await tx.insert(schema.formResponses).values(responsesToInsert);
        }

        return instance;
      });

      await invalidateCache(cacheKeys.all());

      return c.json(result, 201);
    } catch (error) {
      console.error("Error creating form instance:", error);
      return c.json(
        { error: "Failed to create form instance", details: String(error) },
        500
      );
    }
  })

  // Update instance (status, progress)
  .patch("/:id", zValidator("json", updateInstanceSchema), async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();
      const data = c.req.valid("json");

      // Verify instance exists and belongs to org
      const [existing] = await db
        .select()
        .from(schema.formInstances)
        .where(
          and(
            eq(schema.formInstances.id, id),
            eq(schema.formInstances.organizationId, user.organizationId!),
            isNull(schema.formInstances.deletedAt)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "Form instance not found" }, 404);
      }

      const updateData: Partial<typeof schema.formInstances.$inferInsert> = {
        ...data,
        updatedBy: user.id,
        updatedAt: new Date(),
      };

      // Set submittedAt if marking as completed
      if (data.status === "completed" && existing.status !== "completed") {
        updateData.submittedAt = new Date();
        updateData.submittedBy = user.id;
      }

      const [updated] = await db
        .update(schema.formInstances)
        .set(updateData)
        .where(eq(schema.formInstances.id, id))
        .returning();

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

  // Soft delete instance
  .delete("/:id", async (c) => {
    try {
      const user = c.get("user");
      const { id } = c.req.param();

      const [existing] = await db
        .select()
        .from(schema.formInstances)
        .where(
          and(
            eq(schema.formInstances.id, id),
            eq(schema.formInstances.organizationId, user.organizationId!),
            isNull(schema.formInstances.deletedAt)
          )
        )
        .limit(1);

      if (!existing) {
        return c.json({ error: "Form instance not found" }, 404);
      }

      await db
        .update(schema.formInstances)
        .set({
          deletedAt: new Date(),
          deletedBy: user.id,
          updatedBy: user.id,
        })
        .where(eq(schema.formInstances.id, id));

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

  // === Response Management (nested under instances) ===

  // Get all responses for an instance
  .get("/:instanceId/responses", async (c) => {
    try {
      const user = c.get("user");
      const { instanceId } = c.req.param();

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

      const responses = await db
        .select({
          id: schema.formResponses.id,
          formFieldId: schema.formResponses.formFieldId,
          value: schema.formResponses.value,
          version: schema.formResponses.version,
          updatedAt: schema.formResponses.updatedAt,
          fieldName: schema.formFields.name,
        })
        .from(schema.formResponses)
        .leftJoin(
          schema.formFields,
          eq(schema.formResponses.formFieldId, schema.formFields.id)
        )
        .where(eq(schema.formResponses.formInstanceId, instanceId));

      return c.json({ items: responses });
    } catch (error) {
      console.error("Error getting form responses:", error);
      return c.json(
        { error: "Failed to get form responses", details: String(error) },
        500
      );
    }
  })

  // Bulk update responses
  .patch(
    "/:instanceId/responses",
    zValidator(
      "json",
      z.object({
        responses: z.array(
          z.object({
            formFieldId: z.string().uuid(),
            value: z.string().nullable(),
            version: z.number().int().optional(), // For optimistic locking
          })
        ),
      })
    ),
    async (c) => {
      try {
        const user = c.get("user");
        const { instanceId } = c.req.param();
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

        // Update responses in a transaction
        const results = await db.transaction(async (tx) => {
          const updated: Array<{
            formFieldId: string;
            success: boolean;
            version?: number;
            error?: string;
          }> = [];

          for (const response of responses) {
            // Check if response already exists
            const [existing] = await tx
              .select()
              .from(schema.formResponses)
              .where(
                and(
                  eq(schema.formResponses.formInstanceId, instanceId),
                  eq(schema.formResponses.formFieldId, response.formFieldId)
                )
              )
              .limit(1);

            if (existing) {
              // Check optimistic locking if version provided
              if (
                response.version !== undefined &&
                existing.version !== response.version
              ) {
                updated.push({
                  formFieldId: response.formFieldId,
                  success: false,
                  error: "Version mismatch - data may have been modified",
                  version: existing.version,
                });
                continue;
              }

              // Update existing
              const [result] = await tx
                .update(schema.formResponses)
                .set({
                  value: response.value,
                  version: existing.version + 1,
                  updatedAt: new Date(),
                  updatedBy: user.id,
                })
                .where(eq(schema.formResponses.id, existing.id))
                .returning();

              updated.push({
                formFieldId: response.formFieldId,
                success: true,
                version: result.version,
              });
            } else {
              // Insert new response
              const [result] = await tx
                .insert(schema.formResponses)
                .values({
                  formInstanceId: instanceId,
                  formFieldId: response.formFieldId,
                  value: response.value,
                  version: 1,
                  updatedBy: user.id,
                })
                .returning();

              updated.push({
                formFieldId: response.formFieldId,
                success: true,
                version: result.version,
              });
            }
          }

          return updated;
        });

        // Update instance's updatedAt
        await db
          .update(schema.formInstances)
          .set({
            updatedAt: new Date(),
            updatedBy: user.id,
            // Auto-transition to in_progress if still draft
            ...(instance.status === "draft" && { status: "in_progress" }),
          })
          .where(eq(schema.formInstances.id, instanceId));

        await invalidateCache(cacheKeys.all());

        return c.json({ results });
      } catch (error) {
        console.error("Error updating form responses:", error);
        return c.json(
          { error: "Failed to update form responses", details: String(error) },
          500
        );
      }
    }
  )

  // Update single response
  .patch(
    "/:instanceId/responses/:fieldId",
    zValidator(
      "json",
      z.object({
        value: z.string().nullable(),
        version: z.number().int().optional(),
      })
    ),
    async (c) => {
      try {
        const user = c.get("user");
        const { instanceId, fieldId } = c.req.param();
        const { value, version } = c.req.valid("json");

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

        // Check if response exists
        const [existing] = await db
          .select()
          .from(schema.formResponses)
          .where(
            and(
              eq(schema.formResponses.formInstanceId, instanceId),
              eq(schema.formResponses.formFieldId, fieldId)
            )
          )
          .limit(1);

        let result;

        if (existing) {
          // Check optimistic locking
          if (version !== undefined && existing.version !== version) {
            return c.json(
              {
                error: "Version mismatch - data may have been modified",
                currentVersion: existing.version,
              },
              409
            );
          }

          // Update
          [result] = await db
            .update(schema.formResponses)
            .set({
              value,
              version: existing.version + 1,
              updatedAt: new Date(),
              updatedBy: user.id,
            })
            .where(eq(schema.formResponses.id, existing.id))
            .returning();
        } else {
          // Insert
          [result] = await db
            .insert(schema.formResponses)
            .values({
              formInstanceId: instanceId,
              formFieldId: fieldId,
              value,
              version: 1,
              updatedBy: user.id,
            })
            .returning();
        }

        // Update instance's updatedAt
        await db
          .update(schema.formInstances)
          .set({
            updatedAt: new Date(),
            updatedBy: user.id,
            ...(instance.status === "draft" && { status: "in_progress" }),
          })
          .where(eq(schema.formInstances.id, instanceId));

        await invalidateCache(cacheKeys.all());

        return c.json(result);
      } catch (error) {
        console.error("Error updating form response:", error);
        return c.json(
          { error: "Failed to update form response", details: String(error) },
          500
        );
      }
    }
  );

export default app;
