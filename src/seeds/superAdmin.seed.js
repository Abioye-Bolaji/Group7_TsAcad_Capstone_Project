require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/user.model');

const seedSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log(' MongoDB Connected');

        // CHECK IF SUPER ADMIN ALREADY EXISTS
        const existingAdmin = await User.findOne({
            role: 'super_admin',
        });

        if (existingAdmin) {
            console.log('Super Admin already exists');
            process.exit();
        }

        // HASH PASSWORD
        const hashedPassword = await bcrypt.hash(
            process.env.SUPER_ADMIN_PASSWORD,
            Number(process.env.BCRYPT_ROUNDS)
        );

        // CREATE SUPER ADMIN
        const superAdmin = await User.create({
            firstName: 'Winner',
            lastName: 'Ani',
            email: process.env.SUPER_ADMIN_EMAIL,
            password: hashedPassword,
            role: 'super_admin',
            isEmailVerified: true,
        });

        console.log('✅ Super Admin seeded successfully');
        console.log(superAdmin.email);

        process.exit();

    } catch (error) {
        console.error('❌ Seed Error:', error.message);
        process.exit(1);
    }
};

seedSuperAdmin();