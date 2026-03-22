# Underrated - Manual QA Checklist

## 1) Startup / Load
- Run the app through `wrangler pages dev`.
- Confirm the app loads without downloading `movies.slim.json`.
- Confirm entering Movie Entry allows search immediately.
- Simulate an API failure and confirm an error message appears in search results.

## 2) Lobby
- Set player count to `1`: confirm `Start Game` is disabled.
- Set player count to `2+`: confirm `Start Game` is enabled.
- Enter names, increase/decrease player count, confirm existing values are preserved where possible.
- Use duplicate names for two players and confirm later results still show one row per player.

## 3) Movie Entry
- Leave title blank and press `Search`: confirm no action.
- Enter valid query and confirm max 10 rows shown.
- Confirm `Confirm` stays disabled until one radio choice is selected.
- Confirm each click of `Confirm` advances exactly one player prompt.
- Confirm search results come from `/api/search` with no CORS errors.

## 4) Quiz
- Enter invalid year/rating values and confirm validation errors appear.
- Enter a valid 4-digit year and one-decimal rating, then click `Next`.
- Confirm the current entry records correct year/rating matches based on the submitted answers.
- Confirm final `Next` transitions once to Results.

## 5) Results
- Confirm every player appears exactly once.
- Confirm score equals `correctYear + correctRating`.
- Confirm sort is ascending by rating and handles missing rating safely.
- Click `Restart Game` and confirm clean lobby reset with no stale game state.
