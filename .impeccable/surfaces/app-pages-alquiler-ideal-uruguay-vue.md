---
version: 1
slug: "app-pages-alquiler-ideal-uruguay-vue"
primary_target: "app/pages/alquiler-ideal-uruguay.vue"
related_targets: ["app/components/rentals/FitResult.vue","app/components/rentals/FitDestination.vue"]
---

# Household rental planner

The user delegated creative implementation. Extend the current website's light-first visual world without reopening its identity.

Considered structures: (1) a budget calculator with an attached list, (2) a questionnaire with a single recommendation, (3) a map-first multi-destination workspace, (4) a permanent dense comparison spreadsheet, (5) a left editor/right ranked list, (6) a household dashboard with member tabs, (7) a progressive household/places/home worksheet that gives way to ranked results. Build (7): every person remains visible, the phone never has to show a long filter panel beside results, and Edit search remains accessible while scrolling. The three generated composition studies tested guided, persistent, and progressive forms; the progressive study is the chosen hierarchy. Mock imagery and minute estimates are not implementation data.

The first viewport identifies the purpose and starts with the household. Real advert photos appear only in results. Cost, data gaps and distance per person lead the cards. Inputs and textual comparisons use semantic Vue/Vuetify markup; a map is lazy-loaded only after a deliberate action. No generated raster asset is needed in the shipped interface.

Direction contract: THESIS choose a home around the people sharing it; OWN-WORLD Open Sans, existing theme tokens and blue actions; STORY household budget → people's places → housing needs → evidence; FIRST VIEWPORT one manageable section; FORM a progressive worksheet and sticky result edit/compare controls. No popups on arrival, user salaries in URLs, inferred travel times, or guaranteed availability.

Finish checks: 320/390px and desktop, first-visit controls, several household members, remote work plus study, multiple destinations, map fallback, invalid/cancel/retry states, equal-person commute weighting, unknown costs and coordinates, source links, compare three homes, scrolling without losing Edit, and privacy of personal scenario data.
