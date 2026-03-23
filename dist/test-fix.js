"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./src/lib/db");
const projects_1 = require("./src/lib/projects");
async function runTests() {
    // Test 1: Non-existent user should throw an error
    console.log("Test 1: Ensuring non-existent user throws error");
    try {
        await (0, projects_1.ensureProjectForUser)("non-existent-user-id");
        console.log("ERROR: Expected function to throw but it didn't");
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("User not found")) {
            console.log("SUCCESS: Correctly threw error for non-existent user");
        }
        else {
            console.log("ERROR: Unexpected error:", error);
        }
    }
    // Test 2: Existing user should create a project
    console.log("\nTest 2: Existing user should create project");
    // First, create a test user if not exists
    const testEmail = "fix-test@example.com";
    let user = await db_1.db.user.findUnique({ where: { email: testEmail } });
    if (!user) {
        const passwordHash = await require("bcryptjs").hash("password123", 12);
        user = await db_1.db.user.create({
            data: {
                email: testEmail,
                name: "Fix Test User",
                password: passwordHash,
            },
        });
        console.log("Created test user:", user.id);
    }
    else {
        console.log("Using existing test user:", user.id);
    }
    try {
        const project = await (0, projects_1.ensureProjectForUser)(user.id);
        console.log("SUCCESS: Project created for user:", {
            projectId: project.id,
            projectName: project.name,
            userId: user.id
        });
        // Clean up: delete the test project and user
        await db_1.db.projectMember.deleteMany({ where: { projectId: project.id } });
        await db_1.db.project.delete({ where: { id: project.id } });
        await db_1.db.user.delete({ where: { id: user.id } });
        console.log("Cleaned up test project and user");
    }
    catch (error) {
        console.log("ERROR: Failed to create project for existing user:", error);
    }
    await db_1.db.$disconnect();
}
runTests().catch(console.error);
