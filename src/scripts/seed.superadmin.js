/**
 * @desc Super Admin Seeding Script
 * @usage npm run seed:admin
 *
 * Creates the first Super Admin account in the database.
 * Reads credentials from your .env file:
 *   SUPER_ADMIN_EMAIL=admin@yourplatform.com
 *   SUPER_ADMIN_PASSWORD=YourStrongPassword123
 *   SUPER_ADMIN_FIRST_NAME=Super
 *   SUPER_ADMIN_LAST_NAME=Admin
 *
 * Safe to run multiple times — it will NOT create a duplicate
 * if a Super Admin already exists with that email.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const connectDB = require('../config/db.config');

const seedSuperAdmin = async () => {
    console.log('\n🌱 Super Admin Seeder Starting...\n');

    // ── 1. Connect to MongoDB ────────────────────────────────────────────────
    await connectDB();

    // ── 2. Read credentials from .env ────────────────────────────────────────
    const email     = process.env.SUPER_ADMIN_EMAIL;
    const password  = process.env.SUPER_ADMIN_PASSWORD;
    const firstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Super';
    const lastName  = process.env.SUPER_ADMIN_LAST_NAME  || 'Admin';

    if (!email || !password) {
        console.error('❌ Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD in your .env file.');
        console.error('   Please add them and try again.\n');
        process.exit(1);
    }

    // ── 3. Check if a Super Admin already exists ─────────────────────────────
    const existing = await User.findOne({ email });

    if (existing) {
        console.log(`⚠️  A user with email "${email}" already exists.`);
        console.log(`   Role: ${existing.role}`);
        console.log('   Seeder will NOT create a duplicate. Exiting safely.\n');
        await mongoose.disconnect();
        process.exit(0);
    }

    // ── 4. Hash the password ─────────────────────────────────────────────────
    const rounds = Number(process.env.BCRYPT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, rounds);

    // ── 5. Create the Super Admin user ───────────────────────────────────────
    const superAdmin = await User.create({
        firstName,
        lastName,
        email,
        password:        hashedPassword,
        role:            'super_admin',
        tenantId:        null,    // Super Admins don't belong to a tenant
        isEmailVerified: true,    // Pre-verified — no email loop for the first admin
    });

    // ── 6. Success! ──────────────────────────────────────────────────────────
    console.log('✅ Super Admin created successfully!\n');
    console.log('─────────────────────────────────────');
    console.log(`   Name  : ${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log(`   Email : ${superAdmin.email}`);
    console.log(`   Role  : ${superAdmin.role}`);
    console.log(`   ID    : ${superAdmin._id}`);
    console.log('─────────────────────────────────────');
    console.log('\n📋 Next steps:');
    console.log('   1. POST /api/v1/auth/login with these credentials');
    console.log('   2. Use the returned accessToken as a Bearer token');
    console.log('   3. You can now create tenants via POST /api/v1/tenants\n');

    await mongoose.disconnect();
    process.exit(0);
};

// ── Run and catch any top-level errors ──────────────────────────────────────
seedSuperAdmin().catch((err) => {
    console.error('\n❌ Seeder failed with an unexpected error:');
    console.error(err.message);
    mongoose.disconnect();
    process.exit(1);
});
