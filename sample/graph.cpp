#include "graph.h"
#include <iostream>

static bool isSafeToVisit(const Node &node, const VisitState &state) {
  return !state.visited[node.id];
}

static void markVisited(VisitState &state, const Node &node) {
  state.visited[node.id] = true;
  state.order.push_back(node.id);
}

void dfs(const Graph &graph, int startId, VisitState &state) {
  const Node &node = graph.nodes[startId];
  if (!isSafeToVisit(node, state)) {
    return;
  }
  markVisited(state, node);
  for (int neighborId : node.neighbors) {
    dfs(graph, neighborId, state);
  }
}

VisitState traverseFromRoot(const Graph &graph, int rootId) {
  VisitState state;
  state.visited.resize(graph.nodes.size(), false);
  dfs(graph, rootId, state);
  return state;
}

void printVisitOrder(const VisitState &state) {
    for (int id : state.order) {
        std::cout << id << " ";
    }
    std::cout << std::endl;
}

void runTraversal(const Graph &graph, int rootId) {
    VisitState state = traverseFromRoot(graph, rootId);
    printVisitOrder(state);
}

bool hasCycle(const Graph &graph) {
    return false;
}