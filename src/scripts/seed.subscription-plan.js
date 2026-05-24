/**
 * @desc Subscription Plans Seed Script
 * Initializes default subscription plans in the database
 * Run once after deployment or use in application startup
 */

const mongoose = require('mongoose');
require('dotenv').config();
const SubscriptionPlan = require('../models/subscription-plan.model');

const seedPlans = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing plans (optional - comment out to preserve existing plans)
        // await SubscriptionPlan.deleteMany({});
        // console.log('Cleared existing plans');

        // Define subscription plans
        const plans = [
            {
                name: 'Free',
                slug: 'free',
                description: 'Perfect for getting started with basic exam management',
                price: 0,
                currency: 'NGN',
                billingCycle: 'one-time',
                features: {
                    maxActiveCandidates: 50,
                    maxExamsPerMonth: 5,
                    maxStorageGB: 1,
                    allowedFeatures: [
                        'exam-setup',
                        'candidate-management',
                        'basic-results',
                    ],
                    advancedReporting: false,
                    customBranding: false,
                    apiAccess: false,
                    prioritySupport: false,
                    singleSignOn: false,
                },
                isActive: true,
                displayOrder: 1,
            },
            {
                name: 'Basic',
                slug: 'basic',
                description: 'For growing educational institutions and training centers',
                price: 50000, // ₦50,000/month
                currency: 'NGN',
                billingCycle: 'monthly',
                features: {
                    maxActiveCandidates: 500,
                    maxExamsPerMonth: 50,
                    maxStorageGB: 10,
                    allowedFeatures: [
                        'exam-setup',
                        'candidate-management',
                        'results-analytics',
                        'question-bank',
                    ],
                    advancedReporting: true,
                    customBranding: false,
                    apiAccess: false,
                    prioritySupport: true,
                    singleSignOn: false,
                },
                isActive: true,
                displayOrder: 2,
            },
            {
                name: 'Pro',
                slug: 'pro',
                description: 'For large enterprises with advanced requirements',
                price: 150000, // ₦150,000/month
                currency: 'NGN',
                billingCycle: 'monthly',
                features: {
                    maxActiveCandidates: 5000,
                    maxExamsPerMonth: 500,
                    maxStorageGB: 100,
                    allowedFeatures: [
                        'exam-setup',
                        'candidate-management',
                        'results-analytics',
                        'question-bank',
                        'api-access',
                        'custom-domain',
                    ],
                    advancedReporting: true,
                    customBranding: true,
                    apiAccess: true,
                    prioritySupport: true,
                    singleSignOn: true,
                },
                isActive: true,
                displayOrder: 3,
            },
        ];

        // Create or update plans
        for (const planData of plans) {
            const existingPlan = await SubscriptionPlan.findOne({
                slug: planData.slug,
            });

            if (existingPlan) {
                // Update existing plan
                await SubscriptionPlan.updateOne(
                    { slug: planData.slug },
                    planData
                );
                console.log(`✓ Updated plan: ${planData.name}`);
            } else {
                // Create new plan
                await SubscriptionPlan.create(planData);
                console.log(`✓ Created plan: ${planData.name}`);
            }
        }

        console.log('\n✓ Subscription plans seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding plans:', error);
        process.exit(1);
    }
};

// Run seed if this file is executed directly
if (require.main === module) {
    seedPlans();
}

module.exports = seedPlans;
