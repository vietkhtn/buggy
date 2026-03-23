"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./src/lib/db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function createTestUser() {
    try {
        // Check if test user already exists
        const existingUser = await db_1.db.user.findUnique({
            where: { email: "test@example.com" }
        });
        if (existingUser) {
            console.log("Test user already exists:", existingUser.id);
            return existingUser;
        }
        // Create test user
        const passwordHash = await bcryptjs_1.default.hash("password123", 12);
        const user = await db_1.db.user.create({
            data: {
                email: "test@example.com",
                name: "Test User",
                password: passwordHash,
            },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });
        console.log("Created test user:", user);
        return user;
    }
    catch (error) {
        console.error("Error creating test user:", error);
        throw error;
    }
    finally {
        await db_1.db.$disconnect();
    }
}
createTestUser();
