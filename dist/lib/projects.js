"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureProjectForUser = ensureProjectForUser;
exports.userHasProjectAccess = userHasProjectAccess;
const node_crypto_1 = require("node:crypto");
const db_1 = require("./db");
const test_case_ids_1 = require("./test-case-ids");
function defaultProjectName(userName) {
    if (!(userName === null || userName === void 0 ? void 0 : userName.trim()))
        return "My Project";
    return `${userName.split(" ")[0]}'s Project`;
}
function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 48);
}
async function ensureProjectForUser(userId) {
    try {
        // First, check if user already has a project membership
        const existingMembership = await db_1.db.projectMember.findFirst({
            where: { userId },
            include: { project: true },
            orderBy: { createdAt: "asc" },
        });
        if (existingMembership) {
            return existingMembership.project;
        }
        // Verify user exists before proceeding
        const user = await db_1.db.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true },
        });
        // If user doesn't exist, throw a descriptive error
        if (!user) {
            throw new Error(`User not found for ID: ${userId}. Cannot create project.`);
        }
        // Create default project for user
        const name = defaultProjectName(user.name);
        const slugBase = slugify(name) || "project";
        const prefix = (0, test_case_ids_1.deriveTestCasePrefix)(name);
        return await db_1.db.project.create({
            data: {
                name,
                slug: `${slugBase}-${(0, node_crypto_1.randomUUID)().slice(0, 8)}`,
                testCasePrefix: prefix,
                members: {
                    create: {
                        userId: user.id, // Use verified user ID
                        role: "ADMIN",
                    },
                },
            },
        });
    }
    catch (error) {
        // Log error details for debugging
        console.error("Error in ensureProjectForUser:", {
            userId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        // Re-throw to let calling code handle it appropriately
        throw error;
    }
}
async function userHasProjectAccess(userId, projectId) {
    const member = await db_1.db.projectMember.findUnique({
        where: {
            projectId_userId: {
                projectId,
                userId,
            },
        },
    });
    return Boolean(member);
}
