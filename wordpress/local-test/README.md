# Local WordPress for testing

The WordPress tests (`tests/wordpress/ssr.mjs`, `flows.mjs`) run against a WordPress copy on http://localhost:8080 in Claude's workspace. That copy can't be rebuilt from wordpress.org, since the workspace can't reach it, so a packed copy lives on Gid's laptop:

`C:\Users\User\Documents\Coding Projects\Websites\Apex Surgery International\_local-test\apex-wp-test.tgz`

It holds WordPress 6.8.3 on SQLite (no database server), Polylang 3.9.1, the imported content, `router.php`, `start-server.sh` and `START.md`.

To set it up in a new session:

1. Stage the tgz from the laptop and unpack it: `mkdir -p /home/claude/wp && tar -xzf apex-wp-test.tgz -C /home/claude/wp`.
2. Point the theme at the repo: `ln -sfn /root/Apex-Surgery-International/wordpress/theme/apex-surgery /home/claude/wp/site/wp-content/themes/apex-surgery`.
3. Build the theme's assets: `node wordpress/tools/build-theme.mjs` from the repo root.
4. Start it: `bash /home/claude/wp/start-server.sh`. Admin: `apex-admin` / `apex-test-123` (local only).
5. `wp --allow-root --path=/home/claude/wp/site apex import`, then `apex check`.

WP-CLI is `wp-cli.phar` from github.com/wp-cli/builds, which the workspace can reach.
