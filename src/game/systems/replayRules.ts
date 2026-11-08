export function shouldRun(loop: number, sprintHeld: boolean): boolean {
  return loop > 0 ? !sprintHeld : sprintHeld;
}

export function shouldAutoAdvanceSeenDialogue(
  nodeWasSeen: boolean,
  fastForwardHeld: boolean,
): boolean {
  return nodeWasSeen && fastForwardHeld;
}

export function shouldPersistCycleOnShutdown(endingCommitted: boolean): boolean {
  return !endingCommitted;
}
