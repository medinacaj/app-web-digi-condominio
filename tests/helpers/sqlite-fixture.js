import { rmSync } from 'node:fs';

/**
 * Keep SQLite handles open until test teardown, but ALWAYS close them before
 * removing the temporary directory. Windows refuses to unlink open DB files.
 *
 * Hook order matters: node:test executes t.after hooks in registration order.
 * Register just one hook here and add resources via track() as tests create them.
 * Errors are reported, never silently ignored.
 */
export function sqliteTempCleanup(t, dir) {
  const resources = new Set();
  t.after(() => {
    const errors = [];
    for (const resource of [...resources].reverse()) {
      try { resource.close(); } catch (error) { errors.push(error); }
    }
    try { rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 75 }); }
    catch (error) { errors.push(error); }
    if (errors.length) throw new AggregateError(errors, 'SQLite test fixture cleanup failed');
  });
  return {
    track(resource) { resources.add(resource); return resource; },
    close(resource) { resource.close(); resources.delete(resource); },
  };
}
