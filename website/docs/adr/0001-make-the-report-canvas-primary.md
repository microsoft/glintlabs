# Make the report canvas the primary workspace

Publishing Studio will use a full-height desktop workspace with a slim top
status bar, a 72px persistent tool rail, an initially closed 320px contextual
panel, and an independently scrolling canvas containing a centered fixed-width
report surface. Opening the contextual panel resizes rather than covers the
canvas. This keeps the authored report visually primary while preserving stable
access to Document, Issues, Visuals, and Technical tools; selected visuals open
their editor automatically, issue selection highlights affected content, and
image controls live in the contextual panel rather than on the canvas.
