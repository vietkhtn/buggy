"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./src/lib/db");
async function main() {
    try {
        const users = await db_1.db.user.findMany();
        console.log("Users:", users.length);
        users.forEach(u => console.log('-', u.id, u.email));
        const projects = await db_1.db.project.findMany();
        console.log("Projects:", projects.length);
        projects.forEach(p => console.log('-', p.id, p.name));
        const members = await db_1.db.projectMember.findMany();
        console.log("Project members:", members.length);
        members.forEach(m => console.log('- Project:', m.projectId, 'User:', m.userId));
    }
    catch (error) {
        console.error("Error:", error);
    }
    finally {
        await db_1.db.$disconnect();
    }
}
main();
