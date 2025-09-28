// Simple in-memory "database" for customers.
// Each customer is linked to the agent who registered them (agentId).
// NOTE: will replace this with a real DB in a later branch.

const customers = [];

/**
 * Generate a basic unique id (in-memory only).
 * In a real DB we'd use UUIDs or the DB's primary key.
 */
function uid() {
  return 'c_' + Math.random().toString(36).slice(2, 10);
}

module.exports = { customers, uid };
