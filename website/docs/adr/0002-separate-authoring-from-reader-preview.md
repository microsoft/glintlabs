# Separate authoring from the reader preview

Publishing Studio will save a versioned, validated Studio project through a
replaceable storage interface and render that project through a separate
reader-only route. The FHL prototype uses browser storage and local opaque
preview IDs, but authoring controls and reader rendering do not depend on that
storage implementation. This preserves a clean path to approved hosted storage,
authentication, expiration, and private preview links without rebuilding the
report renderer.
