# Figma to Publishing Studio

This is the required path for turning a Glint Labs Figma concept into an
approved, reusable Publishing Studio component.

The objective is not pixel translation. The objective is one verified visual
contract expressed consistently in design, code, structured report data, and
static output.

## Ownership

| Surface | Source of truth |
| --- | --- |
| Figma | Approved composition, hierarchy, responsive intent, and visual states |
| Data-visual library | Data contract, behavior, accessibility, tokens, and rendering |
| Publishing Studio | Source extraction, compatibility checks, provenance, authoring, and placement |
| Report manifest | Versioned instance data and source evidence |

Publishing Studio should consume the library. It should not independently
recreate approved chart markup or CSS.

## The six-stage visual lifecycle

### 1. Frame the evidence

Before drawing, record:

- The claim or decision the visual supports.
- The exact measure, unit, denominator, and source.
- Whether categories are independent, additive, ranked, temporal, or relational.
- The minimum and maximum useful number of data items.
- What the visual must not imply.

**Exit gate:** a reviewer can explain why this visual form matches the data.

### 2. Design the contract in Figma

Create one component or component set with:

- Default report-width state at 752 px.
- Narrow state at 320 px.
- Long-label and maximum-item stress states.
- Selected, focused, empty, and invalid states when applicable.
- Static export state.
- Design annotations for reading order, accessible name, interaction, and
  reduced-motion behavior.

Use component properties only for meaningful variants. Report-specific values
remain example content, not Figma variants. Link the published component, not a
one-off frame or nested instance; report frames can be reorganized or deleted
and do not provide a durable Code Connect target.

**Exit gate:** the Figma component has a stable node URL and all required states.

### 3. Define the code contract

Add a `VisualDefinition` to `src/lib/registry.ts` before implementation. The
definition records:

- Stable visual ID and version.
- Intended and prohibited uses.
- Typed data shape and constraints.
- Required capabilities.
- Figma source.
- Publishing Studio adapter ID and compatibility state.

Then define the TypeScript data type. Invalid or ambiguous input must fail
explicitly rather than silently changing the visual.

**Exit gate:** data can be validated without rendering the component.

### 4. Build the reusable component

Implement the visual as composable React parts:

- Provider/root owns data and interaction state.
- Plot renders the visual encoding.
- Optional legend, selection detail, annotation, source, and data table remain
  explicit children.
- Interaction works with pointer, keyboard, and focus.
- No information exists only on hover.
- Reduced motion and static output preserve meaning.

Test at 320 px and 752 px. Test the longest valid labels and maximum item count.

**Exit gate:** semantics, keyboard behavior, controlled state, invalid data,
responsive states, and package builds pass.

### 5. Add the Publishing Studio adapter

Publishing Studio needs an adapter, not a second chart implementation. The
adapter has four responsibilities:

1. Determine whether imported structured data is compatible with the visual.
2. Transform verified source rows into the library's typed props.
3. Preserve source hash, source block ID, verification timestamp, and visual
   definition version in the report manifest.
4. Render the library component in both Canvas and Reader preview.

The report manifest should store instance data, not copied HTML, SVG, layout
coordinates, or style settings.

Suggested manifest shape:

```ts
type ApprovedVisualBlock<TData> = {
  id: string
  type: 'approved-data-visual'
  visualId: string
  visualVersion: number
  data: TData
  metadata: {
    title: string
    subtitle?: string
    interpretation?: string
    methodology?: string
    source?: string
  }
  provenance: {
    sourceBlockId: string
    sourceSha256: string
    verifiedAt: string
  }
}
```

Publishing Studio can generate authoring fields from the visual definition and
its data contract. Component-specific editors are reserved for truly unique
behaviors.

**Exit gate:** one verified fixture moves from imported source data to Canvas,
Reader preview, saved project, and reopened project without changing values or
provenance.

### 6. Approve and release

Move the registry status from `review` to `approved` only after:

- Design review against the linked Figma component.
- Accessibility review.
- Structured-data fidelity test.
- Publishing Studio end-to-end fixture test.
- Static screenshot/export review.
- Version and migration behavior are documented.

Breaking data-contract changes increment `version`. Existing report manifests
continue rendering with their recorded version until migrated deliberately.

## Streamlined delivery unit

Build one complete vertical slice at a time:

1. One Figma component.
2. One registry definition.
3. One typed React implementation.
4. One Publishing Studio adapter.
5. One verified source fixture.
6. One end-to-end test.

Do not build a large gallery of coded visuals before the first adapter and
manifest path work end to end. Start with one canonical Figma component, one
typed implementation, and one complete Publishing Studio round trip.

## Definition of done

- [ ] Evidence framing and non-implications are documented.
- [ ] Figma has report, narrow, stress, interaction, and static states.
- [ ] Registry definition and typed data contract exist.
- [ ] Component passes accessibility, behavior, responsive, and build checks.
- [ ] Publishing Studio compatibility and transformation are deterministic.
- [ ] Manifest preserves visual ID, version, data, and provenance.
- [ ] Canvas and Reader preview use the library renderer.
- [ ] Static output matches the approved composition.
- [ ] A verified fixture passes an end-to-end round trip.
- [ ] Figma and code are linked through Code Connect when the Figma component
  is published to a shared library.
