import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { supabaseAdmin } from "../lib/supabase.js";

function generateOrgFromEmail(email: string): { name: string; slug: string } {
  // Extract domain from email (e.g., "admin@acme.com" -> "acme")
  const domain = email.split("@")[1]?.split(".")[0] || "default";
  const name = domain.charAt(0).toUpperCase() + domain.slice(1) + " Organization";
  const slug = domain.toLowerCase().replace(/[^a-z0-9]/g, "-");
  return { name, slug };
}

async function createSuperAdmin() {
  const args = process.argv.slice(2);

  // Parse arguments
  let email: string | undefined;
  let password: string | undefined;
  let orgName: string | undefined;
  let orgSlug: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) {
      email = args[i + 1];
    }
    if (args[i] === "--password" && args[i + 1]) {
      password = args[i + 1];
    }
    if (args[i] === "--org-name" && args[i + 1]) {
      orgName = args[i + 1];
    }
    if (args[i] === "--org-slug" && args[i + 1]) {
      orgSlug = args[i + 1];
    }
  }

  if (!email || !password) {
    console.error("Usage: npm run create-super-admin -- --email <email> --password <password> [--org-name <name>] [--org-slug <slug>]");
    console.error("");
    console.error("Arguments:");
    console.error("  --email      Email address for the super admin (required)");
    console.error("  --password   Password, minimum 8 characters (required)");
    console.error("  --org-name   Organization name (optional, auto-generated from email domain)");
    console.error("  --org-slug   Organization slug (optional, auto-generated from email domain)");
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error("Error: Invalid email format");
    process.exit(1);
  }

  // Validate password length
  if (password.length < 8) {
    console.error("Error: Password must be at least 8 characters");
    process.exit(1);
  }

  // Auto-generate org details if not provided
  const generatedOrg = generateOrgFromEmail(email);
  orgName = orgName || generatedOrg.name;
  orgSlug = orgSlug || generatedOrg.slug;

  console.log(`Creating super admin with email: ${email}`);
  console.log(`Organization: ${orgName} (${orgSlug})`);

  // Check if user already exists in our database
  const [existingDbUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (existingDbUser) {
    if (existingDbUser.role === "super_admin") {
      console.log("\nSuper admin already exists in database");
      if (existingDbUser.organizationId) {
        console.log("  Organization ID:", existingDbUser.organizationId);
      } else {
        console.log("  No organization linked (you may want to create one manually)");
      }
      process.exit(0);
    } else {
      console.error("Error: User exists but is not a super admin. Cannot overwrite.");
      process.exit(1);
    }
  }

  // Check if org slug is already taken
  const [existingOrg] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, orgSlug))
    .limit(1);

  let organizationId: string;

  if (existingOrg) {
    console.log(`Organization with slug "${orgSlug}" already exists, using it.`);
    organizationId = existingOrg.id;
  } else {
    // Create organization
    console.log("Creating organization...");
    const [newOrg] = await db
      .insert(schema.organizations)
      .values({
        name: orgName,
        slug: orgSlug,
      })
      .returning();
    organizationId = newOrg.id;
    console.log("  Organization created:", organizationId);
  }

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    // Check if user exists in Supabase Auth but not in our DB
    if (authError.message.includes("already been registered")) {
      console.log("User exists in Supabase Auth but not in database. Syncing...");

      const {
        data: { users },
      } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = users.find((u) => u.email === email);

      if (existingAuthUser) {
        // Create in our database
        await db.insert(schema.users).values({
          id: existingAuthUser.id,
          email,
          role: "super_admin",
          organizationId,
        });

        console.log("\nSuper admin synced successfully!");
        console.log("  User ID:", existingAuthUser.id);
        console.log("  Email:", email);
        console.log("  Organization ID:", organizationId);
        process.exit(0);
      }
    }

    // Rollback: delete org if we just created it
    if (!existingOrg) {
      console.log("Rolling back organization creation...");
      await db.delete(schema.organizations).where(eq(schema.organizations.id, organizationId));
    }

    console.error("Error creating user in Supabase Auth:", authError.message);
    process.exit(1);
  }

  if (!authData?.user) {
    // Rollback org
    if (!existingOrg) {
      await db.delete(schema.organizations).where(eq(schema.organizations.id, organizationId));
    }
    console.error("Error: No user returned from Supabase Auth");
    process.exit(1);
  }

  // Create user in our database
  try {
    await db.insert(schema.users).values({
      id: authData.user.id,
      email,
      role: "super_admin",
      organizationId,
    });
  } catch (dbError) {
    // Rollback: delete user from Supabase Auth and org if we created it
    console.error("Error creating user in database, rolling back...");
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    if (!existingOrg) {
      await db.delete(schema.organizations).where(eq(schema.organizations.id, organizationId));
    }
    throw dbError;
  }

  console.log("\nSuper admin created successfully!");
  console.log("  User ID:", authData.user.id);
  console.log("  Email:", email);
  console.log("  Role: super_admin");
  console.log("  Organization:", orgName);
  console.log("  Organization ID:", organizationId);
  console.log("\nYou can now log in with these credentials.");
  console.log("Access the admin panel at /admin or the main app at /");

  process.exit(0);
}

createSuperAdmin().catch((err) => {
  console.error("Failed to create super admin:", err);
  process.exit(1);
});
