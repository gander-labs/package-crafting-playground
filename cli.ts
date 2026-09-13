// SPDX-License-Identifier: AGPL-3.0-only
import { object } from "@optique/core/constructs";
import { message } from "@optique/core/message";
import { optional } from "@optique/core/modifiers";
import { argument, command, constant } from "@optique/core/primitives";
import { string } from "@optique/core/valueparser";

export const parser = optional(
  command(
    "update",
    object({
      command: constant("update"),
      version: optional(
        argument(string({ metavar: "VERSION" }), {
          description: message`Specific version to update to (defaults to latest).`,
        }),
      ),
    }),
    { description: message`Update this CLI to the latest release.` },
  ),
);
