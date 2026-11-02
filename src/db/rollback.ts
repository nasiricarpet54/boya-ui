// Deliberately fail closed: dropping schema objects may destroy user data.
console.error('Rollback is disabled. Restore a verified backup or deploy a reviewed, data-preserving compensating migration.');
process.exitCode = 1;
