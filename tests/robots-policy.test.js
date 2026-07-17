import assert from "node:assert/strict";
import test from "node:test";
import { inspectRobotsPolicy, isFullyCrawlableRobotsPolicy } from "../tools/robots-policy.mjs";

const sitemap = "https://juliasutter.de/sitemap.xml";

test("accepts the production crawl policy", () => {
  const contents = `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`;
  const policy = inspectRobotsPolicy(contents);
  assert.equal(policy.allowsRoot, true);
  assert.deepEqual(policy.wildcardDisallows, []);
  assert.deepEqual(policy.sitemaps, [sitemap]);
  assert.equal(isFullyCrawlableRobotsPolicy(contents, sitemap), true);
});

test("rejects a wildcard disallow", () => {
  const contents = `User-agent: *\nAllow: /\nDisallow: /en/\n\nSitemap: ${sitemap}\n`;
  assert.deepEqual(inspectRobotsPolicy(contents).wildcardDisallows, ["/en/"]);
  assert.equal(isFullyCrawlableRobotsPolicy(contents, sitemap), false);
});
