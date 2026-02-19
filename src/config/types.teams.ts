export type TeamConfig = {
  id: string;
  name?: string;
  /** Agent ID of the orchestrator / team lead. */
  lead: string;
  /** Agent IDs of team members. */
  members: string[];
  description?: string;
};
