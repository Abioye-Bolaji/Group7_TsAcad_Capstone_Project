require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/user.model');
const Tenant = require('../models/tenant.model');
const Candidate = require('../models/candidate.model');
const CandidateGroup = require('../models/candidate-group.model');
const SubscriptionPlan = require('../models/subscription-plan.model');

const SEED_DATA = {
    superAdmin: {
        firstName: process.env.SUPER_ADMIN_FIRST_NAME || 'Super',
        lastName: process.env.SUPER_ADMIN_LAST_NAME || 'Admin',
        email: process.env.SUPER_ADMIN_EMAIL || 'admin@cbtplatform.com',
        password: process.env.SUPER_ADMIN_PASSWORD || 'Admin123!',
        role: 'super_admin'
    },
    tenants: [
        {
            name: 'Lagos Grammar School',
            slug: 'lagos-grammar',
            email: 'info@lagosgrammar.edu.ng',
            plan: 'pro'
        },
        {
            name: 'Tech Academy Hub',
            slug: 'tech-academy',
            email: 'hello@techacademy.io',
            plan: 'basic'
        }
    ],
    commonPassword: 'Password123!'
};

const seed = async () => {
    try {
        console.log('🌱 Demo Seeder Starting...');
        
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');

        // 1. Seed Super Admin
        let superAdmin = await User.findOne({ email: SEED_DATA.superAdmin.email });
        if (!superAdmin) {
            const hashedPassword = await bcrypt.hash(SEED_DATA.superAdmin.password, 10);
            superAdmin = await User.create({
                ...SEED_DATA.superAdmin,
                password: hashedPassword,
                isEmailVerified: true
            });
            console.log('✅ Super Admin created');
        } else {
            console.log('ℹ️ Super Admin already exists');
        }

        const hashedPassword = await bcrypt.hash(SEED_DATA.commonPassword, 10);

        for (const tenantData of SEED_DATA.tenants) {
            // 2. Seed Tenant
            let tenant = await Tenant.findOne({ slug: tenantData.slug });
            if (!tenant) {
                tenant = await Tenant.create({
                    ...tenantData,
                    createdBy: superAdmin._id,
                    status: 'active'
                });
                console.log(`✅ Tenant "${tenant.name}" created`);
            } else {
                console.log(`ℹ️ Tenant "${tenant.name}" already exists`);
            }

            // 3. Seed Tenant Admin
            const adminEmail = `admin@${tenant.slug}.com`;
            let tenantAdmin = await User.findOne({ email: adminEmail });
            if (!tenantAdmin) {
                tenantAdmin = await User.create({
                    firstName: tenant.name.split(' ')[0],
                    lastName: 'Admin',
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'tenant_admin',
                    tenantId: tenant._id,
                    isEmailVerified: true
                });
                console.log(`   ✅ Admin for ${tenant.name} created (${adminEmail})`);
            }

            // 4. Seed Examiner
            const examinerEmail = `examiner@${tenant.slug}.com`;
            let examiner = await User.findOne({ email: examinerEmail });
            if (!examiner) {
                examiner = await User.create({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: examinerEmail,
                    password: hashedPassword,
                    role: 'examiner',
                    tenantId: tenant._id,
                    isEmailVerified: true
                });
                console.log(`   ✅ Examiner for ${tenant.name} created (${examinerEmail})`);
            }

            // 5. Seed Candidate Group
            const groupName = 'Batch A - 2024';
            let group = await CandidateGroup.findOne({ name: groupName, tenantId: tenant._id });
            if (!group) {
                group = await CandidateGroup.create({
                    name: groupName,
                    tenantId: tenant._id,
                    description: 'Primary testing group',
                    createdBy: tenantAdmin._id
                });
                console.log(`   ✅ Group "${groupName}" created`);
            }

            // 6. Seed Candidates
            for (let i = 1; i <= 3; i++) {
                const candEmail = `student${i}@${tenant.slug}.com`;
                const idNumber = `${tenant.slug.substring(0, 3).toUpperCase()}-2024-${i.toString().padStart(3, '0')}`;
                
                let candidate = await Candidate.findOne({ email: candEmail, tenantId: tenant._id });
                if (!candidate) {
                    const accessPin = await bcrypt.hash('123456', 10);
                    candidate = await Candidate.create({
                        name: `Student ${i}`,
                        email: candEmail,
                        idNumber,
                        tenantId: tenant._id,
                        groupIds: [group._id],
                        accessPin,
                        createdBy: tenantAdmin._id
                    });
                    
                    // Add candidate to group
                    group.candidateIds.push(candidate._id);
                    console.log(`      ✅ Candidate ${i} created: ${idNumber}`);
                }
            }
            await group.save();
        }

        console.log('\n✨ Database seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seed();
