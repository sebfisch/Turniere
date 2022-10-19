export default function (graph) {
  let seen = {};
  const ordered = [];

  function visit(node) {
    if (!seen[node.id]) {
      seen[node.id] = true;
      for (const succ of node.successors) {
        visit(succ);
      }
      ordered.unshift(node);
    }
  }

  let component = [];

  function assign(node) {
    if (!seen[node.id]) {
      seen[node.id] = true;
      for (const pred of node.predecessors) {
        assign(pred);
      }
      component.push(node.id);
    }
  }

  function addComponentRanks() {
    const rank = componentRank();
    for (const id of component) {
      graph.node(id).rank = rank;
    }
  }

  function componentRank() {
    return Math.max(...component.map((id) => rank(id)));
  }

  const result = [];

  function rank(id) {
    return Math.max(
      1,
      ...result
        .flat()
        .map((prevId) => graph.node(prevId))
        .filter((prev) => prev.successors.some((succ) => succ.id === id))
        .map((prev) => prev.rank + 1)
    );
  }

  function groupByRank(comps) {
    if (comps.length === 0) {
      return [];
    }

    const groups = [];
    let current = comps[0];
    let group = [current];

    for (let i = 1; i < comps.length; i++) {
      const next = comps[i];
      if (graph.node(next[0]).rank === graph.node(current[0]).rank) {
        group.push(next);
      } else {
        groups.push(group);
        group = [next];
      }
      current = next;
    }

    groups.push(group);

    return groups;
  }

  for (const node of graph.nodes) {
    visit(node);
  }

  seen = {};
  for (const node of ordered) {
    assign(node);
    if (component.length > 0) {
      addComponentRanks();
      result.push(component);
      component = [];
    }
  }

  return groupByRank(
    result.sort((x, y) => graph.node(x[0]).rank - graph.node(y[0]).rank)
  ).map((comps) => comps.map((ids) => graph.restrictedTo(ids)));
}
