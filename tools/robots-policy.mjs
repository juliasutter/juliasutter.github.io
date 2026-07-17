const parseDirectives = (contents) => contents
  .split(/\r?\n/)
  .map((line) => line.replace(/#.*$/, "").trim())
  .filter(Boolean)
  .map((line) => line.match(/^([^:]+):\s*(.*)$/))
  .filter(Boolean)
  .map((match) => ({ field: match[1].trim().toLowerCase(), value: match[2].trim() }));

export const inspectRobotsPolicy = (contents) => {
  const groups = [];
  let agents = [];
  let rules = [];
  const finishGroup = () => {
    if (agents.length) groups.push({ agents, rules });
    agents = [];
    rules = [];
  };

  const directives = parseDirectives(contents);
  for (const directive of directives) {
    if (directive.field === "user-agent") {
      if (rules.length) finishGroup();
      agents.push(directive.value.toLowerCase());
    } else if (agents.length) {
      rules.push(directive);
    }
  }
  finishGroup();

  const wildcardRules = groups.filter((group) => group.agents.includes("*")).flatMap((group) => group.rules);
  return {
    allowsRoot: wildcardRules.some((rule) => rule.field === "allow" && rule.value === "/"),
    wildcardDisallows: wildcardRules.filter((rule) => rule.field === "disallow" && rule.value).map((rule) => rule.value),
    sitemaps: directives.filter((directive) => directive.field === "sitemap").map((directive) => directive.value)
  };
};

export const isFullyCrawlableRobotsPolicy = (contents, sitemap) => {
  const policy = inspectRobotsPolicy(contents);
  return policy.allowsRoot && policy.wildcardDisallows.length === 0 && policy.sitemaps.includes(sitemap);
};
