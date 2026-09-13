const MINIMUM_MAJOR = 24;

// node:sqlite only exists on newer Node, and the failure without this check is a
// confusing module resolution error.
const [major] = process.versions.node.split(".").map(Number);

if (!major || major < MINIMUM_MAJOR) {
  console.error(
    `This server needs Node ${MINIMUM_MAJOR} or newer for the built in node:sqlite module.\n` +
      `You are running ${process.version}. Install a newer Node and try again.`,
  );
  process.exit(1);
}
