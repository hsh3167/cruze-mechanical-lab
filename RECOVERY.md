# R6+ completion — 2026-10-18

R10 was not recovered. Library filename queries (Cruze, R10, 크루즈), all four saved Cruze Site versions, the complete cloud source history and all advertised refs were checked. The cloud repository advertises only main, ending at R4 commit 03d434f. This release is explicitly R6+, not the missing R10.

The R6 source was recovered from the previous working folder. The complete unmodified copy is in snapshots/R6-original. Its GLB and R4 GLB remain directly downloadable in the viewer. Original R6 geometry remains unchanged in the new export.

63 additive display objects: front cooling stack tubes/fins/header, condenser lines, elastic mounts, latch safety catch and spring, carrier fixings, lighting harness/connectors, washer hose; dashboard vents, HVAC knobs, glovebox, cupholders, armrest, belts, door trims and trunk liners/floor/sill. The original R4 condenser casing is retained; added tubes/fins are a schematic overlay, not a second validated cooling unit.

The rear bench back and three headrests rotate together about a fixed schematic hinge, 0–82.8°. This is not a 60:40 split or a collision-validated mechanism. Downloads represent the neutral rear seat and open hood; the interactive fold is a viewer function.

604 exported meshes + four V2 combustion effects = 608 web objects; all 17 systems and 19 cooling paths preserved. Ten tests pass, covering old geometry, kinematics, cooling paths, added GLB/web parity, rear hinge radius and folding direction. Chrome WebGL loading, cabin mode and range input were inspected with no console errors.

Run from dist: node --test --test-isolation=none integration.test.mjs recovery.test.mjs. Rebuild the additive GLB with node export-plus.mjs. Do not rerun finish-recovery.mjs on already-upgraded source.

Educational approximation, not OEM CAD. Vehicle dimensions, engine bay arrangement, external contours, exact equipment variant and hose routing remain unvalidated. No claim of full R10 equivalence or manufacturing precision.
