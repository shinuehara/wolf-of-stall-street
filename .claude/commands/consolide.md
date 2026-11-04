---
description: Consolidate the session into the repo (notes, docs, decisions) so it can be compacted
---

The owner is about to compact or end this session. Write down everything a fresh session
would need to continue the work without this conversation, then commit and push it.

1. Read `CLAUDE.md`, `docs/HANDOFF.md` and `docs/design.md` as they are now.
2. Update **`docs/HANDOFF.md`** (in Portuguese, like the rest of the docs):
   - "Última consolidação": today's date and the latest commit hash (`git log -1 --oneline`).
   - "Onde estamos": what the game has now, including anything added this session.
   - "Decisões do dono": every preference or decision the owner stated this session.
   - "Perguntas em aberto": questions you asked that the owner has not answered yet.
   - "Próximos passos": updated priorities.
   - "Histórico": one row per new commit since the last consolidation.
3. Update **`docs/design.md`** so every rule and number matches the code (classes, fees,
   perks, items, balance table from the bots).
4. Update **`CLAUDE.md`** with new architecture facts, commands, workflow steps or gotchas
   learned this session (things that cost time to rediscover).
5. Save any helper you wrote outside the repo that will be needed again (scripts, test
   harnesses) under `scripts/`, and document it in `CLAUDE.md`.
6. Run `npx prettier --write CLAUDE.md docs`, then `npx vitest run` to be sure nothing broke.
7. Commit to `main` ("Consolidate session notes: …") and push.
8. Reply to the owner in Portuguese with a short summary of what was recorded and confirm it
   is safe to compact.
