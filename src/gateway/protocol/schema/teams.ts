import { Type, type Static } from "@sinclair/typebox";
import { NonEmptyString } from "./primitives.js";

export const TeamsListParamsSchema = Type.Object({}, { additionalProperties: false });
export type TeamsListParams = Static<typeof TeamsListParamsSchema>;

export const TeamsRunParamsSchema = Type.Object(
  {
    teamId: NonEmptyString,
    message: NonEmptyString,
    sessionKey: Type.Optional(Type.String()),
    deliver: Type.Optional(Type.Boolean()),
    timeout: Type.Optional(Type.Integer({ minimum: 0 })),
    channel: Type.Optional(Type.String()),
    to: Type.Optional(Type.String()),
    thinking: Type.Optional(Type.String()),
    idempotencyKey: Type.Optional(NonEmptyString),
  },
  { additionalProperties: false },
);
export type TeamsRunParams = Static<typeof TeamsRunParamsSchema>;

export const TeamsStatusParamsSchema = Type.Object(
  {
    teamId: NonEmptyString,
  },
  { additionalProperties: false },
);
export type TeamsStatusParams = Static<typeof TeamsStatusParamsSchema>;
