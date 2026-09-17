# References

Reference material is organized by priority. Load the smallest relevant set.

## Priority 1: skill-specific references

Each skill keeps its own reference collection beside its instructions:

```text
skills/<skill-name>/references/
```

When a skill runs, inspect its skill-specific folder first. These documents are the highest-priority domain context for that skill.

## Priority 2: general references

Shared People Science and plugin-wide guidance lives in:

```text
references/general/
```

After the skill-specific folder, inspect the general folder only for shared definitions, privacy guidance, codebook mappings, interpretation guardrails, or architecture rules needed for the task.

## Conflict rule

If skill-specific and general references conflict, prefer the skill-specific reference unless it violates privacy, safety, or the analysis contract.
