export function suiteCoherent(suite, discovered) {
  if (!suite) return true;
  if (!Array.isArray(suite.nodes) || !suite.nodes.length) return false;
  const names = suite.nodes.map(n => n.skill);
  const ids = suite.nodes.map(n => n.id);
  if (new Set(names).size !== names.length || new Set(ids).size !== ids.length) return false;
  const local = suite.nodes.filter(n => !n.component).map(n => n.skill);
  if (local.length !== discovered.length || !local.every(n => discovered.includes(n))) return false;
  if (suite.nodes.some(n => n.component)) {
    if (suite.schema_version !== 2 || !suite.components || typeof suite.components !== 'object') return false;
    const packages = new Set();
    const componentSkills = new Set();
    for (const [id, c] of Object.entries(suite.components)) {
      if (!/^@[^/]+\/[^/]+$/.test(c.package || '') || !c.bin || !Array.isArray(c.skills) || !c.skills.length || packages.has(c.package)) return false;
      packages.add(c.package);
      for (const name of c.skills) {
        if (componentSkills.has(name) || discovered.includes(name)) return false;
        componentSkills.add(name);
        if (!suite.nodes.some(n => n.component === id && n.skill === name)) return false;
      }
    }
    if (suite.nodes.some(n => n.component && !suite.components[n.component]?.skills?.includes(n.skill))) return false;
  }
  return suite.nodes.every(n => (n.requires_skills || []).every(name => names.includes(name)));
}
