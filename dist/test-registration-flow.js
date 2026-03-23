"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./src/lib/db");
const projects_1 = require("./src/lib/projects");
async function testRegistrationFlow() {
    // We'll test with a known user ID from our earlier test
    const testUserId = "cmn3dcu0u0000btvkit0gm8el"; // Our test user ID
    try {
        console.log("Testing ensureProjectForUser with existing user ID:", testUserId);
        // First, let's verify the user exists
        const user = await db_1.db.user.findUnique({
            where: { id: testUserId },
            select: { id: true, email: true, name: true },
        });
        if (!user) {
            console.error("User not found! Creating a test user first...");
            // Create a test user if it doesn't exist
            const bcrypt = require("bcryptjs");
            const passwordHash = await bcrypt.hash("password123", 12);
            const newUser = await db_1.db.user.create({
                data: {
                    email: `test-${Date.now()}@example.com`,
                    name: "Test User",
                    password: passwordHash,
                },
            });
            console.log("Created test user:", newUser.id);
            // Use this new user for the test
            const project = await (0, projects_1.ensureProjectForUser)(newUser.id);
            console.log("Project created successfully for new user:", {
                projectId: project.id,
                projectName: project.name,
                projectSlug: project.slug,
            });
            // Clean up
            await db_1.db.projectMember.deleteMany({ where: { projectId: project.id } });
            await db_1.db.project.delete({ where: { id: project.id } });
            await db_1.db.user.delete({ where: { id: newUser.id } });
            return;
        }
        console.log("Found user:", user);
        // Now test the ensureProjectForUser function
        const project = await (0, projects_1.ensureProjectForUser)(testUserId);
        console.log("Project created successfully:", {
            projectId: project.id,
            projectName: project.name,
            projectSlug: project.slug,
        });
        // Verify project member was created
        const members = await db_1.db.projectMember.findMany({
            where: { projectId: project.id }
        });
        console.log("Project members:", members.length);
        members.forEach(m => {
            console.log(`- User: ${m.userId}, Role: ${m.role}`);
        });
        console.log("\n✅ Test PASSED");
    }
    catch (error) {
        console.error("\n❌ Test FAILED:", error);
    }
    finally {
        await db_1.db.$disconnect();
    }
}
testRegistrationFlow();
