import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, schema } from './index.js';
import { supabaseAdmin } from '../lib/supabase.js';

async function seed() {
  console.log('Starting seed...');

  // Create a test organization first
  const [org] = await db
    .insert(schema.organizations)
    .values({
      name: 'Test Organization',
      slug: 'test-org',
    })
    .onConflictDoNothing()
    .returning();

  let organizationId = org?.id;
  console.log('Organization created:', organizationId || 'already exists');

  // Get existing org if we didn't create one
  if (!organizationId) {
    const [existingOrg] = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, 'test-org'))
      .limit(1);
    organizationId = existingOrg?.id;
    console.log('Using existing organization:', organizationId);
  }

  // Create user in Supabase Auth
  const email = 'hello@robertmarshall.dev';
  const password = 'Password1*';

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email for dev
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('User already exists in Supabase Auth');

      // Get the existing user
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users.find(u => u.email === email);

      if (existingUser) {
        console.log('Found existing auth user:', existingUser.id);

        // Check if user exists in our DB
        const [dbUser] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, existingUser.id))
          .limit(1);

        if (!dbUser) {
          // Create in our DB
          await db.insert(schema.users).values({
            id: existingUser.id,
            email,
            role: 'org_admin',
            organizationId,
            firstName: 'Robert',
            lastName: 'Marshall',
          });
          console.log('User added to database');
        } else {
          console.log('User already exists in database');
        }
      }
    } else {
      throw authError;
    }
  } else if (authUser?.user) {
    console.log('User created in Supabase Auth:', authUser.user.id);

    // Create user in our database
    await db.insert(schema.users).values({
      id: authUser.user.id,
      email,
      role: 'org_admin',
      organizationId,
      firstName: 'Robert',
      lastName: 'Marshall',
    });

    console.log('User created in database');
  }

  console.log('\nSeed completed!');
  console.log('Login credentials:');
  console.log('  Email:', email);
  console.log('  Password:', password);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
