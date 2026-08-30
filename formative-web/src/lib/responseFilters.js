/** Practice / host test submission (Assign → test link). */
export function responseIsTest(response) {
  return Boolean(response?.answers?.__test_take);
}

export function filterProductionResponses(responses) {
  return (responses || []).filter((r) => !responseIsTest(r));
}

export function filterTestResponses(responses) {
  return (responses || []).filter((r) => responseIsTest(r));
}
