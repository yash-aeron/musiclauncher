---
name: caveman-compression
description: Lossless semantic compression for LLM text. Strip grammar and connectives, keep every fact, to cut token count ~25-40% before sending large context to a model. Use when compressing prompts, documents, notes, or agent scratchpad/context to save tokens, or to decompress caveman-compressed text back to fluent English. Triggers on "compress this", "caveman compress", "reduce tokens", "shrink this context", "decompress caveman text".
license: MIT
source: https://github.com/wilpel/caveman-compression
---

# Caveman Compression

**Strip grammar. Keep facts. Save tokens.**

A prompt-based, lossless *semantic* compression technique: remove only what an LLM
can deterministically reconstruct (articles, auxiliaries, connectives, filler),
and preserve everything it cannot (facts, numbers, names, constraints, technical
terms). A downstream model reads the compressed text with no loss of meaning.

```
"In order to optimize the database query performance, we should consider
 implementing an index on the frequently accessed columns."   (70 tokens)
→ "Need fast queries. Check which columns used most. Add index those columns." (50 tokens)
= ~29% fewer tokens, same facts
```

## When to use

- **Compress** context before sending it to a model: long prompts, pasted docs,
  retrieved passages, agent memory/scratchpad, system prompts, knowledge-base text.
- **Decompress** caveman text back to fluent English for a human reader.
- Best on prose with grammatical overhead. Skip on code, JSON, tables, exact
  quotes, or legal text where wording is load-bearing (see Do NOT compress).

## How to compress

Apply the rules below (from `reference/SPEC.md`). Output ONLY the compressed text.

1. **Sentence atomicity** — one atomic thought per sentence. Split compounds:
   `"index needed and query faster"` -> `"Index needed. Query faster."`
2. **2-5 words per sentence** (6-7 allowed only to preserve a constraint).
3. **Eliminate connectives** — drop `and, but, therefore, however, because`
   unless removal creates ambiguity.
4. **Active voice, present tense** — `"data is processed by system"` -> `"System processes data."`
5. **Preserve specifics verbatim** — numbers, names, dates, units, quantifiers
   (`at least 20`, `99.9%`), technical terms (`O(log n)`), locations (`Stockholm`),
   negations (`not`, `never`, `without`), uncertainty (`seems`, `appears to be`),
   and meaning-bearing prepositions (`made from wood`, `stuck to`).
6. **Remove pure intensifiers** — `very, quite, really, extremely, somewhat`.
7. **Omit articles** — `a, an, the`.
8. **Drop pronouns** when the referent is clear (`it, this, that`).
9. **Logical completeness** — never drop a fact or a reasoning step to hit the
   word limit. Fidelity beats brevity.

Always remove: articles; auxiliaries (`is/are/was/were/be/been/have/has/had/do/does/did`);
grammatical prepositions (`of/for/to/in/on/at` when meaning stays clear); clear
pronouns; pure intensifiers.

Always keep: nouns, main verbs, meaningful adjectives, all numbers/quantifiers,
uncertainty qualifiers, relationship prepositions (`from/with/without`),
time/frequency words, names/titles, technical/domain terms, negations.

The full compression prompt is in `reference/compression-prompt.txt`; the formal
rules with examples are in `reference/SPEC.md`.

## How to decompress

Expand caveman text back to natural English: restore articles and connectives,
use proper grammar and smooth flow, and **keep every fact, constraint, and
logical step unchanged**. Output ONLY the expanded text. Full prompt in
`reference/decompression-prompt.txt`.

## Do NOT compress

Code, config, JSON/YAML, tables, exact quotations, URLs, IDs, commands, legal or
contractual language, or anything where the precise wording is the payload.
When unsure whether a token is predictable grammar or a load-bearing fact, keep it.

## Verify

Round-trip check: decompress the output and confirm no fact, number, name,
constraint, or negation was lost or altered. If any changed, the compression was
lossy — redo it, keeping the dropped item.
