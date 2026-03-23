"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./src/lib/db");
const projects_1 = require("./src/lib/projects");
async function testProjectCreation() {
    const testUserId = "cmn3dcu0u0000btvkit0gm8el"; // Our test user ID
    try {
        console.log("Testing project creation for user:", testUserId);
        const project = await (0, projects_1.ensureProjectForUser)(testUserId);
        console.log("Project created successfully:", {
            id: project.id,
            name: project.name,
            slug: project.slug
        });
        // Verify the project member was created
        const members = await db_1.db.projectMember.findMany({
            where: { projectId: project.id }
        });
        console.log("Project members created:", members.length);
        members.forEach(m => {
            console.log(`- User: ${m.userId}, Role: ${m.role}`);
        });
    }
    catch (error) {
        console.error("Error creating project:", error);
    }
    finally {
        await db_1.db.$disconnect();
    }
}
testProjectCreation();
