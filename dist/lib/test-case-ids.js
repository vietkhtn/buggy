"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveTestCasePrefix = deriveTestCasePrefix;
exports.formatTestCaseDisplayId = formatTestCaseDisplayId;
exports.reserveTestCaseDisplayIds = reserveTestCaseDisplayIds;
exports.sanitizeTestCasePrefix = sanitizeTestCasePrefix;
const DEFAULT_PREFIX = "TC";
function normalizePrefix(prefix) {
    const cleaned = (prefix !== null && prefix !== void 0 ? prefix : "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);
    return cleaned || DEFAULT_PREFIX;
}
function deriveTestCasePrefix(name) {
    if (!name)
        return DEFAULT_PREFIX;
    const initials = name
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join("");
    return normalizePrefix(initials || DEFAULT_PREFIX);
}
function formatTestCaseDisplayId(prefix, sequence) {
    const safePrefix = normalizePrefix(prefix);
    const seq = Math.max(1, sequence);
    return `${safePrefix}-${String(seq).padStart(4, "0")}`;
}
async function reserveTestCaseDisplayIds(tx, projectId, count) {
    if (count < 1) {
        throw new Error("count must be at least 1");
    }
    const project = await tx.project.update({
        where: { id: projectId },
        data: { testCaseCounter: { increment: count } },
        select: { testCaseCounter: true, testCasePrefix: true },
    });
    const lastSequence = project.testCaseCounter;
    const start = lastSequence - count + 1;
    const prefix = project.testCasePrefix;
    return Array.from({ length: count }, (_, idx) => formatTestCaseDisplayId(prefix, start + idx));
}
function sanitizeTestCasePrefix(value) {
    return normalizePrefix(value);
}
